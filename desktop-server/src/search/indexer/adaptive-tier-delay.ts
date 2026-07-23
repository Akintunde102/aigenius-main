import type { IndexPhase } from './index-phase.js';
import { TIER_INTER_ITEM_DELAY_MS, type IndexTier } from './index-tier.js';

/**
 * Scale per-file delays from queue depth: faster when the queue is shallow,
 * slower when flooded (except active-project text phase stays responsive).
 */
export function adaptiveTierDelayMs(
  tier: IndexTier,
  phase: IndexPhase,
  pendingCount: number,
): number {
  const base = TIER_INTER_ITEM_DELAY_MS[tier];
  if (base <= 0 && phase === 'text' && tier === 'project_core') return 0;

  if (phase === 'text' && tier === 'project_core') {
    if (pendingCount > 2_000) return 0;
    if (pendingCount < 40) return Math.max(0, Math.floor(base * 0.25));
    return base;
  }

  if (pendingCount < 30) {
    return Math.max(0, Math.floor(base * 0.4));
  }
  if (pendingCount > 8_000) {
    return Math.floor(base * 2.5);
  }
  if (pendingCount > 3_000) {
    return Math.floor(base * 1.5);
  }
  return base;
}
