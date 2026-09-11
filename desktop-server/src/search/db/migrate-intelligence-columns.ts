import type Database from 'better-sqlite3';

/** Adds code-intelligence columns that older `file_index` / symbol tables may lack. */
export function migrateIntelligenceColumns(db: Database.Database): void {
  const fileCols = db.prepare('PRAGMA table_info(file_index)').all() as { name: string }[];
  if (fileCols.length > 0) {
    const names = new Set(fileCols.map((c) => c.name));
    const adds: Array<[string, string]> = [
      ['content_hash', 'TEXT'],
      ['language', 'TEXT'],
      ['index_status', 'TEXT'],
      ['is_generated', 'INTEGER DEFAULT 0'],
      ['last_indexed', 'INTEGER'],
      ['graph_status', "TEXT NOT NULL DEFAULT 'none'"],
      ['graph_indexed_at', 'INTEGER'],
      ['last_accessed_at', 'INTEGER'],
    ];
    for (const [col, type] of adds) {
      if (!names.has(col)) {
        db.exec(`ALTER TABLE file_index ADD COLUMN ${col} ${type}`);
      }
    }
    db.exec(`
      UPDATE file_index
      SET graph_status = 'pending'
      WHERE graph_status = 'none'
        AND index_status = 'ok'
        AND extension IN ('ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs')
    `);
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
