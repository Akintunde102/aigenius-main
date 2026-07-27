import type Database from 'better-sqlite3';
import { upsertDeepGraph } from '../db/queries-chunks.js';
import { shouldSkipDeepGraphIndexing } from './exemptions.js';
import { isTypeScriptExtension } from './ts-morph-indexer.js';

const IDLE_POLL_MS = 4_000;
const GRAPH_BATCH = 3;

type IdleGraphConfig = {
  isQueueIdle: () => boolean;
  listTargets: () => Array<{ db: Database.Database; dbPath: string; pathPrefix: string }>;
};

let timer: NodeJS.Timeout | null = null;
let running = false;

function pickPendingGraphFiles(
  db: Database.Database,
  pathPrefix: string,
  limit: number,
): string[] {
  const norm = pathPrefix.replace(/\\/g, '/');
  const prefixFilter = norm ? 'AND REPLACE(path, CHAR(92), "/") LIKE ?' : '';
  const params: unknown[] = [];
  if (norm) params.push(`${norm}%`);
  params.push(limit);

  const rows = db
    .prepare(
      `SELECT path FROM file_index
       WHERE graph_status = 'pending'
         AND index_status = 'ok'
         ${prefixFilter}
       ORDER BY COALESCE(last_accessed_at, 0) DESC, last_indexed DESC
       LIMIT ?`,
    )
    .all(...params) as Array<{ path: string }>;

  return rows.map((r) => r.path);
}

export function startGraphIdleScheduler(config: IdleGraphConfig): void {
  stopGraphIdleScheduler();
  timer = setInterval(() => {
    if (running || !config.isQueueIdle()) return;
    running = true;
    void (async () => {
      try {
        for (const target of config.listTargets()) {
          if (!config.isQueueIdle()) break;
          const paths = pickPendingGraphFiles(target.db, target.pathPrefix, GRAPH_BATCH);
          for (const filePath of paths) {
            if (!config.isQueueIdle()) break;
            if (shouldSkipDeepGraphIndexing(filePath)) {
              target.db
                .prepare(
                  `UPDATE file_index SET graph_status = 'skipped', graph_indexed_at = ? WHERE path = ?`,
                )
                .run(Date.now(), filePath);
              continue;
            }
            const ext = filePath.split('.').pop() ?? '';
            if (!isTypeScriptExtension(ext)) {
              target.db
                .prepare(
                  `UPDATE file_index SET graph_status = 'complete', graph_indexed_at = ? WHERE path = ?`,
                )
                .run(Date.now(), filePath);
              continue;
            }
            try {
              await upsertDeepGraph(target.db, filePath);
            } catch (err) {
              console.warn('[search-graph-idle] deep graph failed for', filePath, err);
              target.db
                .prepare(`UPDATE file_index SET graph_status = 'error' WHERE path = ?`)
                .run(filePath);
            }
          }
        }
      } catch (err) {
        console.warn('[search-graph-idle] scheduler failed:', err);
      } finally {
        running = false;
      }
    })();
  }, IDLE_POLL_MS);
}

export function stopGraphIdleScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  running = false;
}
