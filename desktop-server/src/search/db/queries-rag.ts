import path from 'path';
import type Database from 'better-sqlite3';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';
import { cleanFtsTerm, runFtsQueryTwiceAfterRebuild } from './queries-fts.js';

export type RagHit = {
  path: string;
  name: string;
  score: number;
  snippet: string;
  mtime: number;
};

export type RagQueryResult = {
  hits: RagHit[];
  hit_count: number;
  scanned_chunks: number;
  index_updated_at_ms: number;
  /** Set when the caller omitted searchable terms and browse filters. */
  hint?: string;
  page?: number;
  page_size?: number;
  has_more?: boolean;
  relevant_total?: number;
  cutoff_score?: number | null;
  graph_partial?: boolean;
};

/**
 * Runs an FTS5 BM25 full-text search and returns AI-friendly hits.
 * Token matching applies to **basename** (`name`), **`content`** (documents, PDFs, etc.;
 * for images this holds OCR text only when image extraction ran during indexing), and
 * **`tags`**. The full directory **`path`** is not token-indexed—filter subtrees with
 * `pathPrefix` instead. Optionally filtered by path_prefix and extensions.
 */
export function ragQuery(
  db: Database.Database,
  contentQuery = '',
  pathQuery = '',
  topK = 8,
  pathPrefix = '',
  extensions?: string[],
): RagQueryResult {
  const norm = pathPrefix ? path.normalize(pathPrefix) : '';

  const normalizedExtensions = Array.isArray(extensions)
    ? extensions.map((e) => e.toLowerCase().replace(/^\./, '').trim()).filter(Boolean)
    : undefined;

  const prefixFilter = norm ? `AND fi.path LIKE ? || '%'` : '';
  const extensionFilter = Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0
    ? `AND fi.extension IN (${normalizedExtensions.map(() => '?').join(',')})`
    : '';

  // Filter out any paths that should be ignored (e.g. AppData, node_modules)
  const exemptionFilter = DEFAULT_IGNORED_PATHS.map(() => `fi.path NOT LIKE ?`).join(' AND ');
  const exemptionClause = exemptionFilter ? `AND (${exemptionFilter})` : '';

  let rows: { path: string; name: string; mtime: number; score: number; excerpt: string }[] = [];

  const safeContentQuery = contentQuery ? cleanFtsTerm(contentQuery) : '';

  if (safeContentQuery && pathQuery) {
    // Scenario A: Both are provided (OR union logic)
    const ftsMatch = `content:(${safeContentQuery}) OR tags:(${safeContentQuery})`;

    const stmt = db.prepare<unknown[], { path: string; name: string; mtime: number; score: number; excerpt: string }>(`
      SELECT path, name, mtime, MAX(score) AS score, excerpt
      FROM (
        SELECT
          fi.path,
          fi.name,
          fi.mtime,
          -rank AS score,
          snippet(file_search, 2, '', '', '…', 48) AS excerpt
        FROM file_search
        JOIN file_index fi ON file_search.path = fi.path
        WHERE file_search MATCH ?
        ${prefixFilter}
        ${extensionFilter}
        ${exemptionClause}

        UNION ALL

        SELECT
          fi.path,
          fi.name,
          fi.mtime,
          0 AS score,
          SUBSTR(CAST(fi.content AS TEXT), 1, 150) AS excerpt
        FROM file_index fi
        WHERE LOWER(REPLACE(fi.path, CHAR(92), '/')) LIKE ?
        ${prefixFilter}
        ${extensionFilter}
        ${exemptionClause}
      )
      GROUP BY path
      ORDER BY score DESC
      LIMIT ?
    `);

    // Prepare parameters for both subqueries
    const params: unknown[] = [ftsMatch];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach(p => params.push(`%${path.sep}${p}${path.sep}%`));

    // For second subquery in UNION
    params.push(`%${pathQuery.toLowerCase().replace(/\\/g, '/')}%`);
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach(p => params.push(`%${path.sep}${p}${path.sep}%`));

    // Limit top_k
    params.push(topK);

    rows = runFtsQueryTwiceAfterRebuild(db, () => stmt.all(...params));
  } else if (safeContentQuery) {
    // Scenario B: Only content_query is provided
    const ftsMatch = `content:(${safeContentQuery}) OR tags:(${safeContentQuery})`;

    const stmt = db.prepare<unknown[], { path: string; name: string; mtime: number; rank: number; excerpt: string }>(`
      SELECT
        fi.path,
        fi.name,
        fi.mtime,
        rank,
        snippet(file_search, 2, '', '', '…', 48) AS excerpt
      FROM file_search
      JOIN file_index fi ON file_search.path = fi.path
      WHERE file_search MATCH ?
      ${prefixFilter}
      ${extensionFilter}
      ${exemptionClause}
      ORDER BY rank
      LIMIT ?
    `);

    const params: unknown[] = [ftsMatch];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach(p => params.push(`%${path.sep}${p}${path.sep}%`));
    params.push(topK);

    const ftsRows = runFtsQueryTwiceAfterRebuild(db, () => stmt.all(...params));
    rows = ftsRows.map(r => ({
      path: r.path,
      name: r.name,
      mtime: r.mtime,
      score: -r.rank, // Invert rank: higher score => better match (for AI)
      excerpt: r.excerpt
    }));
  } else if (pathQuery) {
    // Scenario C: ONLY path_query is provided
    const stmt = db.prepare<unknown[], { path: string; name: string; mtime: number; excerpt: string }>(`
      SELECT
        fi.path,
        fi.name,
        fi.mtime,
        SUBSTR(CAST(fi.content AS TEXT), 1, 150) AS excerpt
      FROM file_index fi
      WHERE LOWER(REPLACE(fi.path, CHAR(92), '/')) LIKE ?
      ${prefixFilter}
      ${extensionFilter}
      ${exemptionClause}
      ORDER BY fi.mtime DESC
      LIMIT ?
    `);

    const params: unknown[] = [`%${pathQuery.toLowerCase().replace(/\\/g, '/')}%`];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach(p => params.push(`%${path.sep}${p}${path.sep}%`));
    params.push(topK);

    const dbRows = stmt.all(...params);
    rows = dbRows.map(r => ({
      path: r.path,
      name: r.name,
      mtime: r.mtime,
      score: 0,
      excerpt: r.excerpt
    }));
  } else if (norm || (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0)) {
    // Scenario D: browse indexed files by path_prefix and/or extensions (no text query)
    const stmt = db.prepare<unknown[], { path: string; name: string; mtime: number; excerpt: string }>(`
      SELECT
        fi.path,
        fi.name,
        fi.mtime,
        SUBSTR(CAST(fi.content AS TEXT), 1, 150) AS excerpt
      FROM file_index fi
      WHERE 1=1
      ${prefixFilter}
      ${extensionFilter}
      ${exemptionClause}
      ORDER BY fi.mtime DESC
      LIMIT ?
    `);

    const params: unknown[] = [];
    if (norm) params.push(norm);
    if (Array.isArray(normalizedExtensions) && normalizedExtensions.length > 0) {
      params.push(...normalizedExtensions);
    }
    DEFAULT_IGNORED_PATHS.forEach(p => params.push(`%${path.sep}${p}${path.sep}%`));
    params.push(topK);

    const dbRows = stmt.all(...params);
    rows = dbRows.map(r => ({
      path: r.path,
      name: r.name,
      mtime: r.mtime,
      score: 0,
      excerpt: r.excerpt
    }));
  } else {
    const totalRow = db
      .prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM file_index')
      .get();
    const statusRow = db
      .prepare<[], { last: number | null }>('SELECT MAX(mtime) AS last FROM file_index')
      .get();

    return {
      hits: [],
      hit_count: 0,
      scanned_chunks: totalRow?.cnt ?? 0,
      index_updated_at_ms: statusRow?.last ?? 0,
      hint:
        'Provide content_query and/or path_query to search text and paths. '
        + 'To browse without keywords, set path_prefix and/or extensions. '
        + 'For files not yet indexed, use local_list_directory.',
    };
  }

  const statusRow = db
    .prepare<[], { last: number | null }>('SELECT MAX(mtime) AS last FROM file_index')
    .get();

  const totalRow = db
    .prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM file_index')
    .get();

  return {
    hits: rows.map((r) => ({
      path: r.path,
      name: r.name,
      score: r.score,
      snippet: r.excerpt,
      mtime: r.mtime,
    })),
    hit_count: rows.length,
    scanned_chunks: totalRow?.cnt ?? 0,
    index_updated_at_ms: statusRow?.last ?? 0,
  };
}
