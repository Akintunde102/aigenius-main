-- Primary store: one row per indexed file
CREATE TABLE IF NOT EXISTS file_index (
  path    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  mtime   INTEGER NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags    TEXT NOT NULL DEFAULT '',
  extension TEXT
);

-- FTS5 virtual table (shadows file_index for ranked full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(
  path UNINDEXED,
  name,
  content,
  tags,
  extension UNINDEXED,
  content=file_index,
  content_rowid=rowid,
  tokenize='unicode61 remove_diacritics 1'
);

-- Keep FTS index consistent with file_index
-- We drop and recreate triggers to ensure they match the latest schema
DROP TRIGGER IF EXISTS fts_ai;
CREATE TRIGGER fts_ai
  AFTER INSERT ON file_index BEGIN
    INSERT INTO file_search(rowid, path, name, content, tags, extension)
    VALUES (new.rowid, new.path, new.name, new.content, new.tags, new.extension);
  END;

DROP TRIGGER IF EXISTS fts_ad;
CREATE TRIGGER fts_ad
  AFTER DELETE ON file_index BEGIN
    INSERT INTO file_search(file_search, rowid, path, name, content, tags, extension)
    VALUES ('delete', old.rowid, old.path, old.name, old.content, old.tags, old.extension);
  END;

DROP TRIGGER IF EXISTS fts_au;
CREATE TRIGGER fts_au
  AFTER UPDATE ON file_index BEGIN
    INSERT INTO file_search(file_search, rowid, path, name, content, tags, extension)
    VALUES ('delete', old.rowid, old.path, old.name, old.content, old.tags, old.extension);
    INSERT INTO file_search(rowid, path, name, content, tags, extension)
    VALUES (new.rowid, new.path, new.name, new.content, new.tags, new.extension);
  END;

-- Fast mtime lookup to skip already-current files
CREATE INDEX IF NOT EXISTS idx_file_mtime ON file_index(mtime);
