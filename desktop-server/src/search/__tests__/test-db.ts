import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { migrateIntelligenceColumns } from '../db/migrate-intelligence-columns.js';
import { ensureBrowseSqlFunctions } from '../db/queries-browse-shared.js';

const SCHEMA_DIR = path.join(__dirname, '..');

const SCHEMA_FILES = [
  'schema.sql',
  'schema-chunks.sql',
  'schema-import-graph.sql',
  'schema-intelligence.sql',
] as const;

export function isSqliteNativeAvailable(): boolean {
  try {
    const db = new Database(':memory:');
    db.close();
    return true;
  } catch {
    return false;
  }
}

export function normPath(p: string): string {
  return path.normalize(p);
}

export function applySearchTestSchema(db: Database.Database): void {
  for (const file of SCHEMA_FILES) {
    const full = path.join(SCHEMA_DIR, file);
    if (fs.existsSync(full)) {
      db.exec(fs.readFileSync(full, 'utf8'));
    }
  }
  migrateIntelligenceColumns(db);
  ensureBrowseSqlFunctions(db);
}

export function createTestSearchDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  applySearchTestSchema(db);
  return db;
}
