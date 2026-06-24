import path from 'path';
import fs from 'fs';
import os from 'os';
import type { SearchModuleConfig } from './types.js';
import { getDb, closeDb } from './db/connection.js';
import { upsertFile, deleteFile, checkMtime, purgeExemptedFiles } from './db/queries.js';
import { WorkerPool } from './indexer/worker-pool.js';
import { startWatcher, type WatchEvent } from './indexer/file-watcher.js';
import { createIndexQueue } from './indexer/index-queue.js';
import { shouldSkipSearchIndexing } from './indexer/exemptions.js';

type IndexQueue = ReturnType<typeof createIndexQueue<WatchEvent>>;
let _queue: IndexQueue | null = null;
let _watchPaths: string[] = [];
let _pool: WorkerPool | null = null;
let _stopWatcher: (() => Promise<void>) | null = null;


/**
 * Registers the local file search module.
 */
export function registerSearchModule(config: SearchModuleConfig): void {
  const {
    watchPaths,
    dbPath,
    modelsDir,
    workerCount = 4,
    batchSize = 10,
    batchIntervalMs = 2000,
    skipImageSearch = false,
  } = config;

  _watchPaths = watchPaths;
  const db = getDb(dbPath);
  purgeExemptedFiles(db);

  // Migration: Populate empty extensions for existing indexed files
  try {
    const missingExtRows = db.prepare("SELECT path FROM file_index WHERE extension IS NULL OR extension = ''").all() as { path: string }[];
    if (missingExtRows.length > 0) {
      console.info(`[search] Populating extension for ${missingExtRows.length} existing files...`);
      const updateExt = db.prepare('UPDATE file_index SET extension = @ext WHERE path = @path');
      db.transaction(() => {
        for (const row of missingExtRows) {
          const ext = path.extname(row.path).toLowerCase().replace(/^\./, '');
          updateExt.run({ ext, path: row.path });
        }
      })();
    }
  } catch (err) {
    console.warn('[search] Failed to migrate empty extensions:', err);
  }

  const pool = new WorkerPool(workerCount, modelsDir, skipImageSearch);
  pool.start();

  let stopWatcher: (() => Promise<void>) | null = null;

  // Batch queue: receives watch events, runs extraction, writes to DB
  const queue = createIndexQueue<WatchEvent>(
    async (batch) => {
      await Promise.all(
        batch.map(async (event) => {
          const filePath = event.path;
          let mtime: number;

          if (event.stats) {
            // Use stats passed from watcher (saves a syscall)
            mtime = Math.floor(event.stats.mtimeMs);
          } else {
            // Fallback for manual re-index or missing stats
            try {
              const stat = fs.statSync(filePath);
              mtime = Math.floor(stat.mtimeMs);
            } catch {
              console.info('[search] File missing during indexing:', filePath);
              deleteFile(db, filePath);
              return;
            }
          }

          // Skip files that haven't changed since last index (unless forced)
          const storedMtime = checkMtime(db, filePath);
          if (storedMtime === mtime && !event.force) return;

          if (shouldSkipSearchIndexing(filePath)) return;

          console.info('\x1b[34m[search] Indexing:\x1b[0m', filePath);
          const output = await pool.run({ path: filePath, mtime });
          if (output.error) {
            console.warn('[search] extract error for', filePath, output.error);
          }

          const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');

          upsertFile(db, {
            path: filePath,
            name: path.basename(filePath),
            mtime,
            content: output.content,
            tags: output.tags.join(' '),
            extension: ext,
          });
        }),
      );
    },
    batchSize,
    batchIntervalMs,
  );

  _queue = queue;

  // File watcher: push events into the queue
  stopWatcher = startWatcher(watchPaths, (event) => {
    if (shouldSkipSearchIndexing(event.path)) return;

    if (event.type === 'unlink') {
      console.info('[search] Watcher: file removed', event.path);
      deleteFile(db, event.path);
    } else {
      // For 'add' and 'change', push the full event (including stats)
      queue.push(event);
    }
  });

  _pool = pool;
  _stopWatcher = stopWatcher;
}

/**
 * Shuts down the search module.
 */
export async function closeSearchModule(): Promise<void> {
  if (_queue) {
    _queue.stop();
    await _queue.flush();
    _queue = null;
  }
  if (_stopWatcher) {
    await _stopWatcher();
    _stopWatcher = null;
  }
  if (_pool) {
    await _pool.terminate();
    _pool = null;
  }
  _watchPaths = [];
  closeDb();
}


/**
 * Returns the search queue singleton.
 */
export function getSearchQueue(): IndexQueue {
  if (!_queue) throw new Error('Search queue not initialized');
  return _queue;
}

/**
 * Returns the configured watch paths.
 */
export function getSearchWatchPaths(): string[] {
  return _watchPaths;
}
