import type Database from 'better-sqlite3';
import { embedBackfill } from '../embedding/chunk-embeddings.js';

const IDLE_POLL_MS = 5_000;
const EMBED_BATCH = 120;

type IdleEmbedConfig = {
  isQueueIdle: () => boolean;
  listTargets: () => Array<{ db: Database.Database; dbPath: string; pathPrefix: string }>;
  modelsDir: string;
};

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startEmbedIdleScheduler(config: IdleEmbedConfig): void {
  stopEmbedIdleScheduler();
  timer = setInterval(() => {
    if (running || !config.isQueueIdle()) return;
    running = true;
    void (async () => {
      try {
        for (const target of config.listTargets()) {
          if (!config.isQueueIdle()) break;
          await embedBackfill(target.db, config.modelsDir, EMBED_BATCH, target.pathPrefix);
        }
      } catch (err) {
        console.warn('[search-embed-idle] backfill failed:', err);
      } finally {
        running = false;
      }
    })();
  }, IDLE_POLL_MS);
}

export function stopEmbedIdleScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
}
