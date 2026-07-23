import type { WatchEvent } from './file-watcher.js';
import {
  TIER_PROCESS_ORDER,
  type IndexTier,
} from './index-tier.js';
import { adaptiveTierDelayMs } from './adaptive-tier-delay.js';
import { normalizeIndexPhase, type IndexPhase } from './index-phase.js';

export type IndexJobScope = {
  dbPath: string;
  projectRoot: string | null;
};

export type TieredQueueItem = WatchEvent & { tier: IndexTier; scope: IndexJobScope };

type QueueState = {
  push: (event: WatchEvent, tier: IndexTier, scope: IndexJobScope) => void;
  flush: (timeoutMs?: number) => Promise<void>;
  waitForIdle: (timeoutMs?: number) => Promise<void>;
  stop: () => void;
  pendingCount: () => number;
  pendingCountByTier: () => Record<IndexTier, number>;
  pendingCountByPhase: () => Record<IndexPhase, number>;
  clearTiers: (...tiers: IndexTier[]) => void;
  onIdle: (fn: () => void) => void;
};

const ACTIVE_TIERS: IndexTier[] = ['project_core', 'project_docs', 'project_media'];
const MAX_ITEM_ATTEMPTS = 3;
const RETRY_BASE_MS = 1_500;

function emptyTierCounts(): Record<IndexTier, number> {
  return {
    project_core: 0,
    project_docs: 0,
    project_media: 0,
    idle_project: 0,
    background: 0,
  };
}

function itemPhase(item: TieredQueueItem): IndexPhase {
  return normalizeIndexPhase(item.phase);
}

function dedupeKey(scope: IndexJobScope, event: WatchEvent): string {
  const phase = normalizeIndexPhase(event.phase);
  return `${scope.dbPath}::${phase}::${event.path}`;
}

/**
 * Priority queue: project code first, then docs, then media OCR, then homedir background.
 * Text phase drains globally before structure phase (bulk scans). Watcher events without
 * `phase` run as a full per-file pipeline.
 */
export function createTieredIndexQueue(
  onItem: (item: TieredQueueItem) => Promise<void>,
): QueueState {
  const buckets: Record<IndexTier, TieredQueueItem[]> = {
    project_core: [],
    project_docs: [],
    project_media: [],
    idle_project: [],
    background: [],
  };
  const queuedPaths: Record<IndexTier, Set<string>> = {
    project_core: new Set(),
    project_docs: new Set(),
    project_media: new Set(),
    idle_project: new Set(),
    background: new Set(),
  };
  let stopped = false;
  let processing = false;
  let processingItem: TieredQueueItem | null = null;
  const idleListeners: Array<() => void> = [];
  let idleNotified = true;

  function pendingCountByTier(): Record<IndexTier, number> {
    const counts = emptyTierCounts();
    for (const tier of TIER_PROCESS_ORDER) {
      counts[tier] = buckets[tier].length;
    }
    if (processingItem) {
      counts[processingItem.tier] += 1;
    }
    return counts;
  }

  function pendingCountByPhase(): Record<IndexPhase, number> {
    const counts: Record<IndexPhase, number> = { text: 0, structure: 0 };
    for (const tier of TIER_PROCESS_ORDER) {
      for (const item of buckets[tier]) {
        if (item.phase == null) {
          counts.text += 1;
          counts.structure += 1;
        } else {
          counts[itemPhase(item)] += 1;
        }
      }
    }
    if (processingItem) {
      if (processingItem.phase == null) {
        counts.text += 1;
        counts.structure += 1;
      } else {
        counts[itemPhase(processingItem)] += 1;
      }
    }
    return counts;
  }

  function pendingCount(): number {
    return TIER_PROCESS_ORDER.reduce((sum, tier) => sum + buckets[tier].length, 0)
      + (processingItem ? 1 : 0);
  }

  function hasActiveProjectWork(phase?: IndexPhase): boolean {
    for (const tier of ACTIVE_TIERS) {
      const batch = buckets[tier];
      if (phase) {
        if (batch.some((x) => x.phase == null || itemPhase(x) === phase)) return true;
      } else if (batch.length > 0) {
        return true;
      }
    }
    if (processingItem && ACTIVE_TIERS.includes(processingItem.tier)) {
      if (!phase || processingItem.phase == null || itemPhase(processingItem) === phase) {
        return true;
      }
    }
    return false;
  }

  function hasAnyTextWork(): boolean {
    for (const tier of TIER_PROCESS_ORDER) {
      if (buckets[tier].some((x) => x.phase == null || itemPhase(x) === 'text')) return true;
    }
    if (processingItem && (processingItem.phase == null || itemPhase(processingItem) === 'text')) {
      return true;
    }
    return false;
  }

  function dequeueFromTier(tier: IndexTier, wantPhase: IndexPhase | 'full'): TieredQueueItem | null {
    const batch = buckets[tier];
    for (let i = 0; i < batch.length; i += 1) {
      const item = batch[i]!;
      if (wantPhase === 'full') {
        if (item.phase != null) continue;
        batch.splice(i, 1);
        queuedPaths[tier].delete(dedupeKey(item.scope, item));
        return item;
      }
      if (item.phase == null) continue;
      if (itemPhase(item) !== wantPhase) continue;
      batch.splice(i, 1);
      queuedPaths[tier].delete(dedupeKey(item.scope, item));
      return item;
    }
    return null;
  }

  function dequeueNext(): TieredQueueItem | null {
    const hasActiveWork = hasActiveProjectWork();
    const textRemaining = hasAnyTextWork();

    // Watcher / full-pipeline items (no phase) — highest priority within tier order.
    for (const tier of TIER_PROCESS_ORDER) {
      if (tier === 'idle_project' && hasActiveWork) continue;
      if (tier === 'background' && (hasActiveWork || buckets.idle_project.length > 0)) continue;
      const full = dequeueFromTier(tier, 'full');
      if (full) return full;
    }

    // Bulk text phase before any structure.
    if (textRemaining) {
      for (const tier of TIER_PROCESS_ORDER) {
        if (tier === 'idle_project' && hasActiveProjectWork('text')) continue;
        if (tier === 'background' && (hasActiveProjectWork('text') || buckets.idle_project.some((x) => x.phase == null || itemPhase(x) === 'text'))) {
          continue;
        }
        const item = dequeueFromTier(tier, 'text');
        if (item) return item;
      }
    }

    // Structure phase — active tiers first, idle only when active tiers are empty.
    for (const tier of TIER_PROCESS_ORDER) {
      if (tier === 'idle_project' && hasActiveWork) continue;
      if (tier === 'background' && (hasActiveWork || buckets.idle_project.length > 0)) continue;
      const item = dequeueFromTier(tier, 'structure');
      if (item) return item;
    }

    return null;
  }

  function notifyIdleIfNeeded(): void {
    if (processing || processingItem || pendingCount() > 0) {
      idleNotified = false;
      return;
    }
    if (idleNotified) return;
    idleNotified = true;
    for (const fn of idleListeners) {
      try {
        fn();
      } catch (err) {
        console.warn('[tiered-index-queue] onIdle listener error:', err);
      }
    }
  }

  async function drain(): Promise<void> {
    if (processing || stopped) return;
    processing = true;
    idleNotified = false;
    try {
      while (!stopped) {
        const item = dequeueNext();
        if (!item) break;
        processingItem = item;
        try {
          await onItem(item);
        } catch (err) {
          console.error('[tiered-index-queue] item error:', err);
          const attempt = (item.attempt ?? 0) + 1;
          if (attempt < MAX_ITEM_ATTEMPTS) {
            const delay = RETRY_BASE_MS * attempt;
            setTimeout(() => {
              if (!stopped) {
                push({ ...item, attempt }, item.tier, item.scope);
              }
            }, delay);
          }
        }
        processingItem = null;
        const phase = item.phase == null ? 'text' : itemPhase(item);
        const delayMs = adaptiveTierDelayMs(item.tier, phase, pendingCount());
        if (delayMs > 0) {
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          await new Promise((r) => setImmediate(r));
        }
      }
    } finally {
      processing = false;
      if (!stopped && pendingCount() > 0) {
        void drain();
      } else {
        notifyIdleIfNeeded();
      }
    }
  }

  function push(event: WatchEvent, tier: IndexTier, scope: IndexJobScope): void {
    if (stopped) return;
    idleNotified = false;
    const key = dedupeKey(scope, event);
    if (queuedPaths[tier].has(key)) {
      const idx = buckets[tier].findIndex(
        (x) => dedupeKey(x.scope, x) === key,
      );
      if (idx !== -1) {
        buckets[tier][idx] = { ...buckets[tier][idx]!, ...event, tier, scope };
        return;
      }
    }
    buckets[tier].push({ ...event, tier, scope });
    queuedPaths[tier].add(key);
    void drain();
  }

  function clearTiers(...tiers: IndexTier[]): void {
    for (const tier of tiers) {
      buckets[tier] = [];
      queuedPaths[tier].clear();
    }
  }

  async function waitForIdle(timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (processing || processingItem || pendingCount() > 0) {
      if (Date.now() > deadline) {
        console.warn('[tiered-index-queue] waitForIdle() timed out after', timeoutMs, 'ms');
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async function flush(timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (pendingCount() > 0 && !stopped) {
      if (Date.now() > deadline) {
        console.warn('[tiered-index-queue] flush() timed out after', timeoutMs, 'ms');
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    await waitForIdle(Math.max(0, deadline - Date.now()));
  }

  function stop(): void {
    stopped = true;
    for (const tier of TIER_PROCESS_ORDER) {
      buckets[tier] = [];
      queuedPaths[tier].clear();
    }
  }

  function onIdle(fn: () => void): void {
    idleListeners.push(fn);
  }

  return {
    push,
    flush,
    waitForIdle,
    stop,
    pendingCount,
    pendingCountByTier,
    pendingCountByPhase,
    clearTiers,
    onIdle,
  };
}
