import path from 'path';
import type Database from 'better-sqlite3';
import type { IndexedFile } from '../types.js';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';

/** One indexed file row with optionally truncated extracted text (bounded read from SQLite). */
export type FileIndexDetailRow = Omit<IndexedFile, 'extension'> & {
  extension: string;
  contentTruncated: boolean;
};

const MAX_LOOKUP_PATH_CHARS = 32_768;
const DEFAULT_DETAIL_CONTENT_CAP = 600_000;

/**
 * Loads a single `file_index` row by primary key. Content is capped in SQL so multi‑MB rows
 * do not allocate full strings in Node.
 */
export function getFileIndexRow(
  db: Database.Database,
  filePath: string,
  maxContentChars = DEFAULT_DETAIL_CONTENT_CAP,
): FileIndexDetailRow | null {
  if (filePath.length === 0 || filePath.length > MAX_LOOKUP_PATH_CHARS) {
    return null;
  }
  const cap = Math.min(Math.max(maxContentChars, 100), 1_000_000);

  const row = db
    .prepare(
      `
      SELECT
        length(content) AS len,
        path,
        name,
        mtime,
        extension,
        tags,
        SUBSTR(content, 1, ?) AS slice
      FROM file_index
      WHERE path = ?
      `,
    )
    .get(cap, filePath) as
    | {
      len: number;
      path: string;
      name: string;
      mtime: number;
      extension: string | null;
      tags: string;
      slice: string;
    }
    | undefined;

  if (!row) return null;

  const contentTruncated = row.len > cap;
  const content = row.slice;

  return {
    path: row.path,
    name: row.name,
    mtime: row.mtime,
    extension: row.extension ?? '',
    tags: row.tags,
    content,
    contentTruncated,
  };
}

/** High-level status used by the `search:status` IPC channel. */
export function getStatus(db: Database.Database): {
  indexed: number;
  watching: boolean;
  lastRun: number;
} {
  const row = db
    .prepare<[], { cnt: number; last: number | null }>(
      'SELECT COUNT(*) AS cnt, MAX(mtime) AS last FROM file_index',
    )
    .get();
  return {
    indexed: row?.cnt ?? 0,
    watching: true,
    lastRun: row?.last ?? 0,
  };
}

/** 
 * Permanently deletes any files from the index that match the exemption list. 
 * Use this during startup or migration to clean up 'noise' from existing databases.
 */
export function purgeExemptedFiles(db: Database.Database): void {
  const exemptionFilter = DEFAULT_IGNORED_PATHS.map(() => `path LIKE ?`).join(' OR ');
  if (!exemptionFilter) return;

  const stmt = db.prepare(`DELETE FROM file_index WHERE ${exemptionFilter}`);
  const params = DEFAULT_IGNORED_PATHS.map(p => `%${path.sep}${p}${path.sep}%`);

  const result = stmt.run(...params);
  if (result.changes > 0) {
    console.info(`[search-db] Purged ${result.changes} exempted files from the index.`);
  }

  const vad = db.prepare(
    `DELETE FROM file_index WHERE instr(lower(replace(path, char(92), '/')), '/public/vad/') > 0`,
  );
  const vadResult = vad.run();
  if (vadResult.changes > 0) {
    console.info(`[search-db] Purged ${vadResult.changes} rows under public/vad from the index.`);
  }
}

/** Bump last_accessed_at for recently read files (graph worker prioritization). */
export function touchFileAccess(db: Database.Database, filePaths: string[]): void {
  if (!filePaths.length) return;
  const now = Date.now();
  const stmt = db.prepare('UPDATE file_index SET last_accessed_at = ? WHERE path = ?');
  db.transaction(() => {
    for (const p of filePaths) {
      if (p) stmt.run(now, p);
    }
  })();
}

export type GraphCoverageStats = {
  total: number;
  complete: number;
  pending: number;
  skipped: number;
  error: number;
  none: number;
};

export function getGraphCoverageStats(
  db: Database.Database,
  pathPrefix = '',
): GraphCoverageStats {
  const norm = pathPrefix ? path.normalize(pathPrefix) : '';
  const prefixFilter = norm ? 'WHERE path LIKE ? || \'%\'' : '';
  const params: unknown[] = norm ? [norm] : [];
  const rows = db
    .prepare(
      `SELECT COALESCE(graph_status, 'none') AS status, COUNT(*) AS cnt
       FROM file_index
       ${prefixFilter}
       GROUP BY status`,
    )
    .all(...params) as Array<{ status: string; cnt: number }>;

  const stats: GraphCoverageStats = {
    total: 0,
    complete: 0,
    pending: 0,
    skipped: 0,
    error: 0,
    none: 0,
  };
  for (const row of rows) {
    stats.total += row.cnt;
    if (row.status === 'complete') stats.complete += row.cnt;
    else if (row.status === 'pending') stats.pending += row.cnt;
    else if (row.status === 'skipped') stats.skipped += row.cnt;
    else if (row.status === 'error') stats.error += row.cnt;
    else stats.none += row.cnt;
  }
  return stats;
}
