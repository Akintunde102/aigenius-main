import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _db: Database.Database | null = null;
let _dbPath: string | null = null;

/**
 * Returns the singleton better-sqlite3 connection, creating it on first call.
 * WAL mode + 32 MB cache for sub-20ms queries on large indexes.
 * MUST be called from the Electron main thread only.
 */
export function getDb(dbPath: string): Database.Database {
  if (_db && _dbPath === dbPath) return _db;
  if (_db) closeDb();

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

  const chunkSchemaPath = path.join(__dirname, '..', 'schema-chunks.sql');
  let needsChunkRebuild = false;
  if (fs.existsSync(chunkSchemaPath)) {
    const chunkSearchInfo = db.prepare('PRAGMA table_info(chunk_search)').all() as { name: string }[];
    const expectedChunkColumns = ['path', 'symbol_name', 'line_start', 'line_end', 'content'];
    if (
      chunkSearchInfo.length > 0 &&
      (chunkSearchInfo.length !== expectedChunkColumns.length ||
        expectedChunkColumns.some((name, i) => chunkSearchInfo[i]?.name !== name))
    ) {
      console.info('[search-db] Migrating: Rebuilding chunk_search virtual table for schema alignment...');
      db.exec('DROP TABLE IF EXISTS chunk_search');
      needsChunkRebuild = true;
    }
    db.exec(fs.readFileSync(chunkSchemaPath, 'utf8'));
    if (needsChunkRebuild) {
      console.info('[search-db] Rebuilding chunk_search FTS index...');
      db.exec("INSERT INTO chunk_search(chunk_search) VALUES('rebuild')");
    }
  }

  const importSchemaPath = path.join(__dirname, '..', 'schema-import-graph.sql');
  if (fs.existsSync(importSchemaPath)) {
    db.exec(fs.readFileSync(importSchemaPath, 'utf8'));
  }

  const intelligenceSchemaPath = path.join(__dirname, '..', 'schema-intelligence.sql');
  if (fs.existsSync(intelligenceSchemaPath)) {
    db.exec(fs.readFileSync(intelligenceSchemaPath, 'utf8'));
  }

  migrateIntelligenceColumns(db);

  // If we dropped the search table, it's recreated empty by the schema. We must rebuild it from the content table.
  if (needsRebuild) {
    console.info('[search-db] Index rebuild started (this may take a few seconds)...');
    db.exec("INSERT INTO file_search(file_search) VALUES('rebuild')");
    console.info('[search-db] Index rebuild complete.');
  }

  _db = db;
  _dbPath = dbPath;
  return db;
}

function migrateIntelligenceColumns(db: Database.Database): void {
  const fileCols = db.prepare('PRAGMA table_info(file_index)').all() as { name: string }[];
  if (fileCols.length > 0) {
    const names = new Set(fileCols.map((c) => c.name));
    const adds: Array<[string, string]> = [
      ['content_hash', 'TEXT'],
      ['language', 'TEXT'],
      ['index_status', 'TEXT'],
      ['is_generated', 'INTEGER DEFAULT 0'],
      ['last_indexed', 'INTEGER'],
    ];
    for (const [col, type] of adds) {
      if (!names.has(col)) {
        db.exec(`ALTER TABLE file_index ADD COLUMN ${col} ${type}`);
      }
    }
  }

  const symCols = db.prepare('PRAGMA table_info(symbol_index)').all() as { name: string }[];
  if (symCols.length > 0) {
    const names = new Set(symCols.map((c) => c.name));
    if (!names.has('confidence')) {
      db.exec("ALTER TABLE symbol_index ADD COLUMN confidence TEXT NOT NULL DEFAULT 'high'");
    }
    if (!names.has('language')) {
      db.exec('ALTER TABLE symbol_index ADD COLUMN language TEXT');
    }
  }
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
    _dbPath = null;
  }
}

export function getActiveDbPath(): string | null {
  return _dbPath;
}
