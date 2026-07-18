-- Code intelligence layer: structural graph, boundaries, makefile targets, symbol FTS

-- Structural edges between symbols (calls, extends, implements, imports)
CREATE TABLE IF NOT EXISTS symbol_edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_symbol_id INTEGER NOT NULL,
  to_symbol_id INTEGER,
  to_name TEXT,
  to_path TEXT,
  kind TEXT NOT NULL,
  line INTEGER,
  confidence TEXT NOT NULL DEFAULT 'high',
  FOREIGN KEY (from_symbol_id) REFERENCES symbol_index(id) ON DELETE CASCADE,
  FOREIGN KEY (to_symbol_id) REFERENCES symbol_index(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_edge_from ON symbol_edges(from_symbol_id);
CREATE INDEX IF NOT EXISTS idx_edge_to ON symbol_edges(to_symbol_id);
CREATE INDEX IF NOT EXISTS idx_edge_kind ON symbol_edges(kind);

-- API routes, IPC channels, DB entities — cross-language front doors
CREATE TABLE IF NOT EXISTS symbol_boundaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol_id INTEGER,
  file_path TEXT NOT NULL,
  line INTEGER NOT NULL,
  boundary_type TEXT NOT NULL,
  label TEXT,
  confidence TEXT NOT NULL DEFAULT 'high',
  FOREIGN KEY (symbol_id) REFERENCES symbol_index(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_boundary_file ON symbol_boundaries(file_path);
CREATE INDEX IF NOT EXISTS idx_boundary_type ON symbol_boundaries(boundary_type);

-- Makefile build graph (separate from call graph)
CREATE TABLE IF NOT EXISTS makefile_targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  target TEXT NOT NULL,
  prerequisites TEXT NOT NULL DEFAULT '',
  line INTEGER NOT NULL,
  UNIQUE(file_path, target)
);

CREATE INDEX IF NOT EXISTS idx_makefile_file ON makefile_targets(file_path);

-- Keyword search over symbol names/signatures
CREATE VIRTUAL TABLE IF NOT EXISTS symbol_search USING fts5(
  name,
  signature,
  kind UNINDEXED,
  path UNINDEXED,
  symbol_id UNINDEXED,
  tokenize='unicode61 remove_diacritics 1'
);
