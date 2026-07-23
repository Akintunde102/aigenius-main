import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _dbPool = new Map<string, Database.Database>();
let _primaryDbPath: string | null = null;

function openDbConnection(dbPath: string): Database.Database {

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -65536'); // 64 MB
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('mmap_size = 1073741824'); // 1 GB memory-mapped I/O
  db.pragma('temp_store = MEMORY');

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
  if (searchExists) {
    const searchSqlRow = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'file_search'").get() as { sql: string } | undefined;
    const searchSql = searchSqlRow?.sql ?? '';
    if (!searchHasExtension || !searchSql.includes('prefix=')) {
      console.info('[search-db] Migrating: Rebuilding file_search virtual table for schema alignment (prefix)...');
      db.exec("DROP TABLE IF EXISTS file_search");
      needsRebuild = true;
    }
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
    const chunkExists = chunkSearchInfo.length > 0;
    const expectedChunkColumns = ['path', 'symbol_name', 'line_start', 'line_end', 'content'];
    
    const columnsMatch = chunkSearchInfo.length === expectedChunkColumns.length &&
      expectedChunkColumns.every((name, i) => chunkSearchInfo[i]?.name === name);

    if (chunkExists) {
      const chunkSqlRow = db.prepare("SELECT sql FROM sqlite_schema WHERE name = 'chunk_search'").get() as { sql: string } | undefined;
      const chunkSql = chunkSqlRow?.sql ?? '';
      if (!columnsMatch || !chunkSql.includes('prefix=')) {
        console.info('[search-db] Migrating: Rebuilding chunk_search virtual table for schema alignment (prefix)...');
        db.exec('DROP TABLE IF EXISTS chunk_search');
        needsChunkRebuild = true;
      }
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

  return db;
}

/**
 * Returns a pooled better-sqlite3 connection (one per dbPath).
 * WAL mode allows concurrent readers while the indexer writes — search never closes sibling DBs.
 */
export function getDb(dbPath: string): Database.Database {
  const existing = _dbPool.get(dbPath);
  if (existing) return existing;

  const db = openDbConnection(dbPath);
  _dbPool.set(dbPath, db);
  _primaryDbPath = dbPath;
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
    if (!names.has('qualified_name')) {
      db.exec('ALTER TABLE symbol_index ADD COLUMN qualified_name TEXT');
      db.exec('CREATE INDEX IF NOT EXISTS idx_symbol_qname ON symbol_index(qualified_name)');
    }
    if (!names.has('signature_hash')) {
      db.exec('ALTER TABLE symbol_index ADD COLUMN signature_hash TEXT');
    }
    if (!names.has('last_analyzed_at')) {
      db.exec('ALTER TABLE symbol_index ADD COLUMN last_analyzed_at INTEGER');
    }
  }

  const edgeCols = db.prepare('PRAGMA table_info(symbol_edges)').all() as { name: string }[];
  if (edgeCols.length > 0) {
    const edgeNames = new Set(edgeCols.map((c) => c.name));
    if (!edgeNames.has('stale')) {
      db.exec('ALTER TABLE symbol_edges ADD COLUMN stale INTEGER NOT NULL DEFAULT 0');
    }
  }
}

/**
 * Returns the already-open singleton DB without requiring the dbPath.
 * Throws if `getDb()` has not been called yet (i.e. before `registerSearchModule`).
 */
export function getSearchDb(): Database.Database {
  if (_primaryDbPath) return getDb(_primaryDbPath);
  const first = _dbPool.values().next().value as Database.Database | undefined;
  if (!first) throw new Error('Search DB not initialised — call getDb(dbPath) first');
  return first;
}

/** Closes one or all pooled DB connections (call on app quit). */
export function closeDb(dbPath?: string): void {
  if (dbPath) {
    const db = _dbPool.get(dbPath);
    if (db) {
      db.close();
      _dbPool.delete(dbPath);
    }
    if (_primaryDbPath === dbPath) {
      _primaryDbPath = _dbPool.keys().next().value ?? null;
    }
    return;
  }

  for (const [p, db] of _dbPool) {
    db.close();
    _dbPool.delete(p);
  }
  _primaryDbPath = null;
}

export function getActiveDbPath(): string | null {
  return _primaryDbPath;
}

export function listOpenDbPaths(): string[] {
  return [..._dbPool.keys()];
}
