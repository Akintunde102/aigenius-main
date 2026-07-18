import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let sqliteNativeAvailable: boolean | null = null;

/** True when better-sqlite3 native bindings match the current Node ABI. */
export function isSqliteNativeAvailable(): boolean {
  if (sqliteNativeAvailable !== null) return sqliteNativeAvailable;
  try {
    const probe = new Database(':memory:');
    probe.close();
    sqliteNativeAvailable = true;
  } catch {
    sqliteNativeAvailable = false;
  }
  return sqliteNativeAvailable;
}

/** In-memory SQLite with full code-intelligence schema (file + chunk + import). */
export function createTestSearchDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const searchDir = path.join(__dirname, '..');
  for (const file of ['schema.sql', 'schema-chunks.sql', 'schema-import-graph.sql', 'schema-intelligence.sql']) {
    db.exec(fs.readFileSync(path.join(searchDir, file), 'utf8'));
  }

  const fileCols = db.prepare('PRAGMA table_info(file_index)').all() as { name: string }[];
  if (fileCols.length > 0) {
    const names = new Set(fileCols.map((c) => c.name));
    for (const [col, type] of [
      ['content_hash', 'TEXT'],
      ['language', 'TEXT'],
      ['index_status', 'TEXT'],
      ['is_generated', 'INTEGER DEFAULT 0'],
      ['last_indexed', 'INTEGER'],
    ] as const) {
      if (!names.has(col)) db.exec(`ALTER TABLE file_index ADD COLUMN ${col} ${type}`);
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

  return db;
}

/** Normalize paths in snapshots for cross-platform stability. */
export function normPath(p: string): string {
  return p.replace(/\\/g, '/');
}
