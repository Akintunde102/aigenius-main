import path from 'path';
import fs from 'fs';
import os from 'os';
import type { SearchModuleConfig } from './types.js';
import { getDb, closeDb } from './db/connection.js';
import { upsertFile, deleteFile, checkMtime, checkContentHash, purgeExemptedFiles } from './db/queries.js';
import { upsertFileStructure } from './db/queries-chunks.js';
import { WorkerPool } from './indexer/worker-pool.js';
import { startWatcher, type WatchEvent } from './indexer/file-watcher.js';
import { createIndexQueue } from './indexer/index-queue.js';
import { shouldSkipSearchIndexing } from './indexer/exemptions.js';
import { hashContent } from './indexer/content-hash.js';
import { resetTsMorphProjects } from './indexer/ts-morph-indexer.js';
import { languageForExtension } from './indexer/language-indexer.js';
import {
  refreshSearchStatusFromDb,
  resetSearchStatusSnapshot,
  setSearchStatusDbPath,
  updateSearchStatusCache,
} from './status-snapshot.js';

type IndexQueue = ReturnType<typeof createIndexQueue<WatchEvent>>;
let _queue: IndexQueue | null = null;
let _watchPaths: string[] = [];
let _pool: WorkerPool | null = null;
let _modelsDir: string = '';
let _skipImageSearch = false;
let _stopWatcher: (() => Promise<void>) | null = null;

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

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
  _modelsDir = modelsDir;
  _skipImageSearch = skipImageSearch;
  const db = getDb(dbPath);
  purgeExemptedFiles(db);
  setSearchStatusDbPath(dbPath);
  refreshSearchStatusFromDb(db);

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

  // Batch queue: receives watch events, runs extraction, writes to DB.
  // Process sequentially with event-loop yields so /health and /search/status stay responsive during heavy indexing.
  const queue = createIndexQueue<WatchEvent>(
    async (batch) => {
      for (const event of batch) {
        updateSearchStatusCache({
          queue_depth: queue.pendingCount(),
          scan_in_progress: true,
        });

        const filePath = event.path;
        let mtime: number;

        if (event.stats) {
          mtime = Math.floor(event.stats.mtimeMs);
        } else {
          try {
            const stat = fs.statSync(filePath);
            mtime = Math.floor(stat.mtimeMs);
          } catch {
            console.info('[search] File missing during indexing:', filePath);
            deleteFile(db, filePath);
            await yieldEventLoop();
            continue;
          }
        }

        const storedMtime = checkMtime(db, filePath);
        if (storedMtime === mtime && !event.force) {
          await yieldEventLoop();
          continue;
        }

        if (shouldSkipSearchIndexing(filePath)) {
          await yieldEventLoop();
          continue;
        }

        console.info('\x1b[34m[search] Indexing:\x1b[0m', filePath);
        const output = await pool.run({ path: filePath, mtime });
        if (output.error) {
          console.warn('[search] extract error for', filePath, output.error);
        }

        const contentHash = hashContent(output.content);
        const storedHash = checkContentHash(db, filePath);
        if (storedHash === contentHash && !event.force) {
          await yieldEventLoop();
          continue;
        }

        const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');

        await yieldEventLoop();
        upsertFile(db, {
          path: filePath,
          name: path.basename(filePath),
          mtime,
          content: output.content,
          tags: output.tags.join(' '),
          extension: ext,
          content_hash: contentHash,
          language: languageForExtension(ext),
          index_status: output.error ? `extract_error: ${output.error}` : 'ok',
          last_indexed: Date.now(),
        });

        await yieldEventLoop();
        try {
          await upsertFileStructure(db, filePath, output.content, ext, _modelsDir);
        } catch (structErr) {
          console.warn('[search] chunk/symbol index error for', filePath, structErr);
          db.prepare('UPDATE file_index SET index_status = ? WHERE path = ?').run(
            `structure_error: ${structErr instanceof Error ? structErr.message : String(structErr)}`,
            filePath,
          );
        }

        refreshSearchStatusFromDb(db);
        updateSearchStatusCache({
          queue_depth: queue.pendingCount(),
          scan_in_progress: queue.pendingCount() > 0,
        });

        await yieldEventLoop();
      }
    },
    batchSize,
    batchIntervalMs,
  );

  _queue = queue;

  // File watcher: push events into the queue
  stopWatcher = startWatcher(watchPaths, (event) => {
    if (shouldSkipSearchIndexing(event.path)) return;

    if (event.type === 'git_branch_switch') {
      console.info('[search] Git branch switch detected — batch re-index');
      resetTsMorphProjects();
      void (async () => {
        const { walkProjectFiles } = await import('./indexer/project-walk.js');
        for (const root of watchPaths) {
          for (const filePath of walkProjectFiles(root)) {
            queue.push({ type: 'change', path: filePath, force: true });
          }
        }
      })();
      return;
    }

    if (event.type === 'unlink') {
      console.info('[search] Watcher: file removed', event.path);
      deleteFile(db, event.path);
      refreshSearchStatusFromDb(db);
      updateSearchStatusCache({
        queue_depth: queue.pendingCount(),
        scan_in_progress: queue.pendingCount() > 0,
      });
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
  _modelsDir = '';
  resetSearchStatusSnapshot();
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

/**
 * Switch to a per-project SQLite index (closes watcher/queue, reopens DB).
 */
export async function switchSearchProject(config: {
  dbPath: string;
  watchPaths: string[];
  modelsDir?: string;
  skipImageSearch?: boolean;
}): Promise<void> {
  await closeSearchModule();
  registerSearchModule({
    dbPath: config.dbPath,
    watchPaths: config.watchPaths,
    modelsDir: config.modelsDir ?? _modelsDir,
    skipImageSearch: config.skipImageSearch ?? _skipImageSearch,
  });
}
