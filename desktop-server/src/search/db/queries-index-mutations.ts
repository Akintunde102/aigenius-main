import type Database from 'better-sqlite3';
import type { FileResult, IndexedFile } from '../types.js';
import { cleanFtsTerm, runFtsQueryTwiceAfterRebuild } from './queries-fts.js';

/** Returns search results ranked by FTS5 BM25. */
export function searchFiles(
  db: Database.Database,
  term: string,
  limit = 20,
): FileResult[] {
  const stmt = db.prepare<[string, number], FileResult>(`
    SELECT
      fi.path,
      fi.name,
      fi.mtime,
      snippet(file_search, 2, '<mark>', '</mark>', '…', 32) AS excerpt,
      rank,
      fi.tags
    FROM file_search
    JOIN file_index fi ON file_search.path = fi.path
    WHERE file_search MATCH ?
    ORDER BY rank
    LIMIT ?
  `);
  const safeTerm = cleanFtsTerm(term);
  if (!safeTerm) return [];
  return runFtsQueryTwiceAfterRebuild(db, () => stmt.all(safeTerm, limit));
}

/** INSERT OR REPLACE a file record (triggers keep FTS in sync). */
export function upsertFile(db: Database.Database, file: IndexedFile): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO file_index (
      path, name, mtime, content, tags, extension,
      content_hash, language, index_status, is_generated, last_indexed
    )
    VALUES (
      @path, @name, @mtime, @content, @tags, @extension,
      @content_hash, @language, @index_status, @is_generated, @last_indexed
    )
  `);
  stmt.run({
    ...file,
    content_hash: file.content_hash ?? null,
    language: file.language ?? null,
    index_status: file.index_status ?? null,
    is_generated: file.is_generated ?? 0,
    last_indexed: file.last_indexed ?? Date.now(),
  });
}

/** Delete a file record — the AFTER DELETE trigger removes the FTS row. */
export function deleteFile(db: Database.Database, filePath: string): void {
  db.prepare(
    'DELETE FROM symbol_search WHERE symbol_id IN (SELECT id FROM symbol_index WHERE path = ?)',
  ).run(filePath);
  db.prepare('DELETE FROM symbol_boundaries WHERE file_path = ?').run(filePath);
  db.prepare('DELETE FROM makefile_targets WHERE file_path = ?').run(filePath);
  db.prepare('DELETE FROM import_index WHERE importer_path = ? OR imported_path = ?').run(filePath, filePath);
  db.prepare('DELETE FROM chunk_embeddings WHERE chunk_id IN (SELECT id FROM file_chunks WHERE path = ?)').run(filePath);
  db.prepare('DELETE FROM file_chunks WHERE path = ?').run(filePath);
  db.prepare('DELETE FROM symbol_index WHERE path = ?').run(filePath);
  db.prepare('DELETE FROM file_index WHERE path = ?').run(filePath);
}

/** Returns the stored mtime for a path, or null if not yet indexed. */
export function checkMtime(
  db: Database.Database,
  filePath: string,
): number | null {
  const row = db
    .prepare<[string], { mtime: number }>(
      'SELECT mtime FROM file_index WHERE path = ?',
    )
    .get(filePath);
  return row ? row.mtime : null;
}

/** Returns stored content hash, or null if not yet indexed. */
export function checkContentHash(
  db: Database.Database,
  filePath: string,
): string | null {
  const row = db
    .prepare<[string], { content_hash: string | null }>(
      'SELECT content_hash FROM file_index WHERE path = ?',
    )
    .get(filePath);
  return row?.content_hash ?? null;
}
