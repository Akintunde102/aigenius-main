-- Resolved import edges for blast-radius queries
CREATE TABLE IF NOT EXISTS import_index (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  importer_path TEXT NOT NULL,
  imported_path TEXT,
  module_spec TEXT NOT NULL,
  line INTEGER NOT NULL,
  is_relative INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_import_importer ON import_index(importer_path);
CREATE INDEX IF NOT EXISTS idx_import_imported ON import_index(imported_path);
CREATE INDEX IF NOT EXISTS idx_import_module ON import_index(module_spec COLLATE NOCASE);
