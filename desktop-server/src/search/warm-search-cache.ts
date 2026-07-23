import type Database from 'better-sqlite3';
import { searchFiles } from './db/queries.js';

/** Prime SQLite page cache + FTS after project focus switch. */
export function warmSearchCache(db: Database.Database, _pathPrefix?: string): void {
  try {
    db.prepare('SELECT COUNT(*) AS c FROM file_index').get();
    db.prepare('SELECT COUNT(*) AS c FROM symbol_index').get();
    searchFiles(db, 'function', 1);
  } catch (err) {
    console.warn('[search-warm] cache warmup failed:', err);
  }
}
