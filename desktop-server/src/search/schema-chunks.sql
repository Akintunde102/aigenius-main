-- Symbol graph (one row per symbol per file)
CREATE TABLE IF NOT EXISTS symbol_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  signature TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_symbol_path ON symbol_index(path);
CREATE INDEX IF NOT EXISTS idx_symbol_name ON symbol_index(name COLLATE NOCASE);

-- Symbol-bounded text chunks for finer-grained RAG
CREATE TABLE IF NOT EXISTS file_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  symbol_name TEXT,
  content TEXT NOT NULL,
  UNIQUE(path, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunk_path ON file_chunks(path);

-- FTS5 over chunks
CREATE VIRTUAL TABLE IF NOT EXISTS chunk_search USING fts5(
  path UNINDEXED,
  symbol_name UNINDEXED,
  line_start UNINDEXED,
  line_end UNINDEXED,
  content,
  content=file_chunks,
  content_rowid=rowid,
  tokenize='unicode61 remove_diacritics 1'
);

DROP TRIGGER IF EXISTS chunk_fts_ai;
CREATE TRIGGER chunk_fts_ai
  AFTER INSERT ON file_chunks BEGIN
    INSERT INTO chunk_search(rowid, path, symbol_name, line_start, line_end, content)
    VALUES (new.rowid, new.path, new.symbol_name, new.line_start, new.line_end, new.content);
  END;

DROP TRIGGER IF EXISTS chunk_fts_ad;
CREATE TRIGGER chunk_fts_ad
  AFTER DELETE ON file_chunks BEGIN
    INSERT INTO chunk_search(chunk_search, rowid, path, symbol_name, line_start, line_end, content)
    VALUES ('delete', old.rowid, old.path, old.symbol_name, old.line_start, old.line_end, old.content);
  END;

DROP TRIGGER IF EXISTS chunk_fts_au;
CREATE TRIGGER chunk_fts_au
  AFTER UPDATE ON file_chunks BEGIN
    INSERT INTO chunk_search(chunk_search, rowid, path, symbol_name, line_start, line_end, content)
    VALUES ('delete', old.rowid, old.path, old.symbol_name, old.line_start, old.line_end, old.content);
    INSERT INTO chunk_search(rowid, path, symbol_name, line_start, line_end, content)
    VALUES (new.rowid, new.path, new.symbol_name, new.line_start, new.line_end, new.content);
  END;

-- Optional semantic vectors (chunk_id → float32 blob)
CREATE TABLE IF NOT EXISTS chunk_embeddings (
  chunk_id INTEGER PRIMARY KEY,
  vector BLOB NOT NULL,
  FOREIGN KEY (chunk_id) REFERENCES file_chunks(id) ON DELETE CASCADE
);
