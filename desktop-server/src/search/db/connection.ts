import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: Database.Database | null = null;

/**
 * Returns the singleton better-sqlite3 connection, creating it on first call.
 * WAL mode + 32 MB cache for sub-20ms queries on large indexes.
 * MUST be called from the Electron main thread only.
 */
export function getDb(dbPath: string): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -32000'); // 32 MB
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  // --- Migration: Add 'extension' column to file_index if missing ---
  const tableInfo = db.prepare("PRAGMA table_info(file_index)").all() as { name: string }[];
  if (tableInfo.length > 0) {
    const hasExtension = tableInfo.some((c) => c.name === 'extension');
    if (!hasExtension) {
      console.info('[search-db] Migrating: Adding extension column to file_index...');
      db.exec("ALTER TABLE file_index ADD COLUMN extension TEXT");
    }
  }

  // --- Migration: Check if file_search virtual table matches current schema ---
  // FTS5 external content tables can get 'missing row' errors if the content table changes rowids or schema.
  const searchTableInfo = db.prepare("PRAGMA table_info(file_search)").all() as { name: string }[];
  const searchExists = searchTableInfo.length > 0;
  const searchHasExtension = searchTableInfo.some((c) => c.name === 'extension');
  
  let needsRebuild = false;
  if (searchExists && !searchHasExtension) {
    console.info('[search-db] Migrating: Rebuilding file_search virtual table for extension support...');
    db.exec("DROP TABLE IF EXISTS file_search");
    needsRebuild = true;
  }

  const schema = fs.readFileSync(
    path.join(__dirname, '..', 'schema.sql'),
    'utf8',
  );
  db.exec(schema);

  // If we dropped the search table, it's recreated empty by the schema. We must rebuild it from the content table.
  if (needsRebuild) {
    console.info('[search-db] Index rebuild started (this may take a few seconds)...');
    db.exec("INSERT INTO file_search(file_search) VALUES('rebuild')");
    console.info('[search-db] Index rebuild complete.');
  }

  _db = db;
  return db;
}

/**
 * Returns the already-open singleton DB without requiring the dbPath.
 * Throws if `getDb()` has not been called yet (i.e. before `registerSearchModule`).
 */
export function getSearchDb(): Database.Database {
  if (!_db) throw new Error('Search DB not initialised — call registerSearchModule first');
  return _db;
}

/** Closes the DB connection (call on app quit). */
export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
