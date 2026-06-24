-- Primary store: one row per indexed file
CREATE TABLE IF NOT EXISTS file_index (
  path    TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  mtime   INTEGER NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  tags    TEXT NOT NULL DEFAULT ''
);

-- FTS5 virtual table (shadows file_index for ranked full-text search)
CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(
  path UNINDEXED,
  name,
  content,
  tags,
  content=file_index,
  content_rowid=rowid,
  tokenize='unicode61 remove_diacritics 1'
);

-- Keep FTS index consistent with file_index
CREATE TRIGGER IF NOT EXISTS fts_ai
  AFTER INSERT ON file_index BEGIN
    INSERT INTO file_search(rowid, path, name, content, tags)
    VALUES (new.rowid, new.path, new.name, new.content, new.tags);
  END;

CREATE TRIGGER IF NOT EXISTS fts_ad
  AFTER DELETE ON file_index BEGIN
    INSERT INTO file_search(file_search, rowid, path, name, content, tags)
    VALUES ('delete', old.rowid, old.path, old.name, old.content, old.tags);
  END;

CREATE TRIGGER IF NOT EXISTS fts_au
  AFTER UPDATE ON file_index BEGIN
    INSERT INTO file_search(file_search, rowid, path, name, content, tags)
    VALUES ('delete', old.rowid, old.path, old.name, old.content, old.tags);
    INSERT INTO file_search(rowid, path, name, content, tags)
    VALUES (new.rowid, new.path, new.name, new.content, new.tags);
  END;

-- Fast mtime lookup to skip already-current files
CREATE INDEX IF NOT EXISTS idx_file_mtime ON file_index(mtime);
