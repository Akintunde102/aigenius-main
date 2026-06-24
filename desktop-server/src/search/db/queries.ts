import path from 'path';
import type Database from 'better-sqlite3';
import type { FileResult, IndexedFile } from '../types.js';
import { DEFAULT_IGNORED_PATHS } from '../indexer/exemptions.js';

/**
 * Colon-shaped code points FTS5 parses as column qualifiers (ASCII `:` plus common look‑alikes).
 */
const FTS_COLUMN_SPEC_CHARS =
  /\u003A|\uFF1A|\uFE55|\u0589|\u02F8|\u205A|\u2236|\u2A74|\u2E59|\u2E35|\u2E34/g;

function rebuildFileSearchFts(db: Database.Database): void {
  db.exec("INSERT INTO file_search(file_search) VALUES('rebuild')");
}

function isFtsVirtualTableIntegrityError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException & { code?: string }).code;
  return (
    code === 'SQLITE_CORRUPT_VTAB' ||
    code === 'SQLITE_CORRUPT' ||
    /missing row .*['"`]?\s*\w*\.?['"`]?file_index|fts5:/i.test(err.message)
  );
}

function runFtsQueryTwiceAfterRebuild<T>(
  db: Database.Database,
  exec: () => T,
): T {
  try {
    return exec();
  } catch (first) {
    if (!isFtsVirtualTableIntegrityError(first)) throw first;
    console.warn(
      '[search-db] FTS5 out of sync with file_search; rebuilding index:',
      first instanceof Error ? first.message : String(first),
    );
    rebuildFileSearchFts(db);
    return exec();
  }
}

/**
 * Cleans a search term for SQLite FTS5.
 * Balances double quotes and avoids syntax errors while preserving "*" for prefix search.
 */
function cleanFtsTerm(term: string): string {
  let cleaned = term.normalize('NFC').trim();
  if (!cleaned) return '';

  // Count double quotes; if odd, append one to balance
  const quoteCount = (cleaned.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    cleaned += '"';
  }

  const regex = /("[^"]*")|([^"]+)/g;
  let result = '';
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match[1]) {
      // Quoted phrases are kept exactly as is
      result += match[1] + ' ';
    } else if (match[2]) {
      // For unquoted text, wrap every word in quotes to prevent FTS5 syntax errors
      const words = match[2].trim().split(/\s+/);
      for (const word of words) {
        if (!word) continue;

        // Preserve SQLite FTS5 boolean operators
        if (word === 'AND' || word === 'OR' || word === 'NOT') {
          result += word + ' ';
          continue;
        }

        // Safely extract trailing asterisks for prefix searches
        const stars = word.match(/\*+$/);
        if (stars) {
          const w = word.slice(0, -stars[0].length).replace(/"/g, '');
          if (w) result += `"${w}"* `;
        } else {
          const w = word.replace(/"/g, '');
          if (w) result += `"${w}" `;
        }
      }
    }
  }

  return result.trim();
}

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
    INSERT OR REPLACE INTO file_index (path, name, mtime, content, tags, extension)
    VALUES (@path, @name, @mtime, @content, @tags, @extension)
  `);
  stmt.run(file);
}

/** Delete a file record — the AFTER DELETE trigger removes the FTS row. */
export function deleteFile(db: Database.Database, filePath: string): void {
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

/** Escapes `%`, `_`, `\` for `LIKE ... ESCAPE '\\'`. */
function escapeSqlLikeFragment(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

const browseDirsRegistered = new WeakSet<Database.Database>();

/** First browse level from an indexed file path (works for Windows drives, UNC, POSIX). */
function firstLevelFolderFromFilePath(filePath: string): string {
  if (!filePath) return '';
  try {
    const normalized = path.normalize(filePath);
    const dir = path.dirname(normalized);
    if (!dir || dir === '.') return '';

    const parsed = path.parse(normalized);
    const root = parsed.root;
    if (root.length > 0) {
      const rel = path.relative(root, dir);
      if (!rel || rel === '.') return path.normalize(root);
      const first = rel.split(path.sep).find(Boolean);
      if (!first) return path.normalize(root);
      return path.normalize(path.join(root, first));
    }

    const first = dir.split(path.sep).find(Boolean);
    return first ? path.normalize(first) : '';
  } catch {
    return '';
  }
}

/** Registers `dirname_path(p)` for GROUP BY / ORDER BY (OS-correct `path.dirname`). */
export function ensureBrowseSqlFunctions(db: Database.Database): void {
  if (browseDirsRegistered.has(db)) return;
  db.function(
    'dirname_path',
    { deterministic: true },
    (input: unknown) => {
      if (typeof input !== 'string' || input.length === 0) return '';
      try {
        return String(path.dirname(input));
      } catch {
        return '';
      }
    },
  );
  db.function(
    'first_level_dir',
    { deterministic: true },
    (input: unknown) => {
      if (typeof input !== 'string' || input.length === 0) return '';
      return String(firstLevelFolderFromFilePath(input));
    },
  );
  browseDirsRegistered.add(db);
}

/** Best-effort `\` → `/` for SQL filters (matches Windows + POSIX rows). */
function comparablePathExpr(column = 'path'): string {
  return `REPLACE(${column}, CHAR(92), '/')`;
}

function normalizeFolderPrefixForFilter(raw: string): string | null {
  let s = raw.trim();
  if (s.length === 0) return null;
  s = path.normalize(s);
  s = s.replace(/\\/g, '/');
  while (s.includes('//')) s = s.replace('//', '/');
  while (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  if (s.length === 0) return null;
  return s;
}

/** Restricts rows to a folder subtree: path equals prefix or is under `prefix/`. */
function pushFolderSubtreeFilter(whereParts: string[], params: unknown[], folderPrefixRaw: string | undefined): void {
  const base = typeof folderPrefixRaw === 'string' ? normalizeFolderPrefixForFilter(folderPrefixRaw) : null;
  if (!base) return;
  const cmp = comparablePathExpr();
  const escLike = escapeSqlLikeFragment(base);
  whereParts.push(`(${cmp} = ? OR ${cmp} LIKE ? ESCAPE '\\')`);
  params.push(base, `${escLike}/%`);
}

const MAX_CONTENT_CONTAINS_CHARS = 400;

/** Shared substring / extension filters for browse + folder rollups. */
function buildBrowseWhereParts(filters: {
  pathContains?: string;
  /** Case-insensitive substring match on extracted `content` (LIKE, escaped). */
  contentContains?: string;
  extension?: string;
  folderPrefix?: string;
  /** Exact parent directory (`path.dirname`-style); do not combine with recursive `folderPrefix`. */
  parentDirectoryExact?: string;
}): { whereSql: string; params: unknown[] } {
  const whereParts: string[] = [];
  const params: unknown[] = [];

  const rawPath = typeof filters.pathContains === 'string' ? filters.pathContains.trim() : '';
  if (rawPath.length > 0) {
    whereParts.push('path LIKE ? ESCAPE \'\\\'');
    params.push(`%${escapeSqlLikeFragment(rawPath)}%`);
  }

  const rawContent =
    typeof filters.contentContains === 'string' ? filters.contentContains.trim() : '';
  if (rawContent.length > 0) {
    const slice = rawContent.slice(0, MAX_CONTENT_CONTAINS_CHARS);
    /** `content` must be textual for LIKE — cast avoids SQLITE_MISMATCH when rows are stored as BLOB. */
    whereParts.push("CAST(content AS TEXT) LIKE ?");
    params.push(`%${slice}%`);
  }

  const rawExt = typeof filters.extension === 'string' ? filters.extension.trim() : '';
  const extNormalized = rawExt.replace(/^\./, '').slice(0, 64).toLowerCase();
  if (/^[a-z0-9._-]+$/.test(extNormalized) && extNormalized.length > 0) {
    whereParts.push(`(
      LOWER(extension) = ?
      OR LOWER(path) LIKE ?
    )`);
    params.push(extNormalized, `%.${extNormalized}`);
  }

  const parentRaw = typeof filters.parentDirectoryExact === 'string' ? filters.parentDirectoryExact.trim() : '';
  if (parentRaw.length > 0) {
    const np = path.normalize(parentRaw);
    whereParts.push('LOWER(dirname_path(path)) = LOWER(?)');
    params.push(np);
  } else {
    pushFolderSubtreeFilter(whereParts, params, filters.folderPrefix);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
  return { whereSql, params };
}

export type FileIndexBrowseRow = {
  path: string;
  name: string;
  folderPath: string;
  mtime: number;
  extension: string;
  tags: string;
  /** SQLite `LENGTH(content)` — useful for relative size sorting; JS `string.length` can differ slightly. */
  contentChars: number;
  /** First `previewChars` grapheme-friendly slice responsibility left to SQLite SUBSTR(char). */
  contentHead: string;
  /** Empty when the document is shorter than overlapping head + tail thresholds. */
  contentTail: string;
  /** @deprecated Prefer contentHead — kept for older clients expecting one preview blob. */
  contentPreview: string;
};

export type FileIndexBrowseSortColumn =
  | 'path'
  | 'name'
  | 'folder'
  | 'mtime'
  | 'extension'
  | 'tags'
  | 'contentLength';

export type BrowseFileIndexSortDirection = 'asc' | 'desc';

export type BrowseFileIndexOptions = {
  limit?: number;
  offset?: number;
  pathContains?: string;
  /** Substring match on indexed `content` (LIKE, escaped). Max length clamped server-side. */
  contentContains?: string;
  extension?: string;
  /** Max characters read from content start for list rows (default 2000). */
  previewChars?: number;
  /** Max characters read from content end when it does not overlap the head (default 280). */
  previewTailChars?: number;
  /** Only rows whose parent folder matches exactly (SQLite `dirname_path`). */
  parentDirectory?: string;
  /** Recursive subtree (`path` equals or under prefix). Mutually exclusive with `parentDirectory`. */
  folderPrefix?: string;
  sortColumn?: FileIndexBrowseSortColumn;
  sortDir?: BrowseFileIndexSortDirection;
};

/** Whitelisted ORDER BY fragments (identifiers only — never interpolate user strings here). */
const BROWSE_ORDER_SQL: Record<FileIndexBrowseSortColumn, string> = {
  path: 'path COLLATE NOCASE',
  name: 'name COLLATE NOCASE',
  folder: 'dirname_path(path) COLLATE NOCASE',
  mtime: 'mtime',
  extension: "LOWER(TRIM(CAST(COALESCE(extension, '') AS TEXT))) COLLATE NOCASE",
  tags: 'tags COLLATE NOCASE',
  /** Cast so ordering works when SQLite affinity stores `content` as BLOB or mixed. */
  contentLength: 'LENGTH(content)',
};

export type FolderGroupSummaryRow = {
  folderPath: string;
  fileCount: number;
  maxMtime: number;
};

export type FolderGroupSortKey = 'folder' | 'files' | 'recent';

export type BrowseFolderGroupsOptions = {
  limit?: number;
  offset?: number;
  pathContains?: string;
  contentContains?: string;
  extension?: string;
  /** Optional subtree filter (matches browse `folderPrefix`). */
  folderPrefix?: string;
  sortBy?: FolderGroupSortKey;
  sortDir?: BrowseFileIndexSortDirection;
};

/**
 * Paginates `file_index` for debugging (paths, tags, head/tail text slices — bounded in SQL).
 * Filters use SQL parameters; path substrings use escaped LIKE patterns.
 */
export function browseFileIndex(
  db: Database.Database,
  options: BrowseFileIndexOptions = {},
): { rows: FileIndexBrowseRow[]; total: number } {
  ensureBrowseSqlFunctions(db);
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.offset) || 0, 0);
  const previewChars = Math.min(
    Math.max(Number(options.previewChars) ?? 2000, 50),
    50_000,
  );
  const previewTailChars = Math.min(Math.max(Number(options.previewTailChars) ?? 280, 0), 8000);

  const parentTrim =
    typeof options.parentDirectory === 'string' ? options.parentDirectory.trim() : '';
  const useParentOnly = parentTrim.length > 0;

  const { whereSql, params } = buildBrowseWhereParts({
    pathContains: typeof options.pathContains === 'string' ? options.pathContains : undefined,
    contentContains: typeof options.contentContains === 'string' ? options.contentContains : undefined,
    extension: typeof options.extension === 'string' ? options.extension : undefined,
    folderPrefix: useParentOnly
      ? undefined
      : typeof options.folderPrefix === 'string'
        ? options.folderPrefix
        : undefined,
    parentDirectoryExact: useParentOnly ? parentTrim : undefined,
  });

  const sortCol: FileIndexBrowseSortColumn =
    options.sortColumn && BROWSE_ORDER_SQL[options.sortColumn] ? options.sortColumn : 'mtime';
  const sortDirResolved: BrowseFileIndexSortDirection =
    options.sortDir === 'asc' || options.sortDir === 'desc'
      ? options.sortDir
      : sortCol === 'mtime' || sortCol === 'contentLength'
        ? 'desc'
        : 'asc';
  const orderExpr = BROWSE_ORDER_SQL[sortCol];
  const orderSql = `ORDER BY ${orderExpr} ${sortDirResolved === 'asc' ? 'ASC' : 'DESC'}, path COLLATE NOCASE ASC`;
  const countRow = db
    .prepare<unknown[], { cnt: number }>(`SELECT COUNT(*) AS cnt FROM file_index ${whereSql}`)
    .get(...params);
  const total = countRow?.cnt ?? 0;

  const listStmt = db.prepare(`
    SELECT
      path,
      name,
      dirname_path(path) AS folder_path,
      mtime,
      COALESCE(extension, '') AS extension,
      tags,
      LENGTH(content) AS content_chars,
      SUBSTR(CAST(content AS TEXT), 1, ?) AS content_head,
      CASE
        WHEN LENGTH(content) > (? + ?)
        THEN SUBSTR(CAST(content AS TEXT), LENGTH(content) - ? + 1, ?)
        ELSE ''
      END AS content_tail
    FROM file_index
    ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `);

  const sliceParams =
    previewTailChars > 0
      ? [previewChars, previewChars, previewTailChars, previewTailChars, previewTailChars]
      : [previewChars, previewChars, 0, 0, 0];
  const listParams = [...sliceParams, ...params, limit, offset];
  const rawRows = listStmt.all(...listParams) as Array<{
    path: string;
    name: string;
    folder_path: string;
    mtime: number;
    extension: string;
    tags: string;
    content_chars: number;
    content_head: string;
    content_tail: string;
  }>;

  const rows: FileIndexBrowseRow[] = rawRows.map((r) => ({
    path: r.path,
    name: r.name,
    folderPath: r.folder_path,
    mtime: r.mtime,
    extension: r.extension,
    tags: r.tags,
    contentChars: r.content_chars,
    contentHead: r.content_head,
    contentTail: r.content_tail,
    contentPreview: r.content_head,
  }));

  return { rows, total };
}

/** Distinct-folder rollups over the filtered index — for “how scanning is spread” analysis. */
export function browseFolderGroups(
  db: Database.Database,
  options: BrowseFolderGroupsOptions = {},
): { folders: FolderGroupSummaryRow[]; total: number } {
  ensureBrowseSqlFunctions(db);
  const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
  const offset = Math.max(Number(options.offset) || 0, 0);

  const { whereSql, params } = buildBrowseWhereParts({
    pathContains: typeof options.pathContains === 'string' ? options.pathContains : undefined,
    contentContains: typeof options.contentContains === 'string' ? options.contentContains : undefined,
    extension: typeof options.extension === 'string' ? options.extension : undefined,
    folderPrefix: typeof options.folderPrefix === 'string' ? options.folderPrefix : undefined,
  });

  const sortKey: FolderGroupSortKey =
    options.sortBy === 'files' || options.sortBy === 'recent' ? options.sortBy : 'folder';
  const dirIn: BrowseFileIndexSortDirection =
    options.sortDir === 'asc' || options.sortDir === 'desc' ? options.sortDir : 'desc';
  const asc = dirIn === 'asc';

  let outerOrderSql = asc
    ? 'ORDER BY folder_path COLLATE NOCASE ASC'
    : 'ORDER BY folder_path COLLATE NOCASE DESC';
  if (sortKey === 'files') {
    outerOrderSql = asc
      ? 'ORDER BY file_count ASC, folder_path COLLATE NOCASE ASC'
      : 'ORDER BY file_count DESC, folder_path COLLATE NOCASE ASC';
  }
  if (sortKey === 'recent') {
    outerOrderSql = asc
      ? 'ORDER BY max_mtime ASC, folder_path COLLATE NOCASE ASC'
      : 'ORDER BY max_mtime DESC, folder_path COLLATE NOCASE ASC';
  }

  const countDistinct = db
    .prepare<unknown[], { cnt: number }>(
      `
      SELECT COUNT(*) AS cnt FROM (
        SELECT dirname_path(path) AS fp
        FROM file_index
        ${whereSql}
        GROUP BY fp
      )
    `,
    )
    .get(...params);
  const total = countDistinct?.cnt ?? 0;

  const listStmt = db.prepare(
    `
    SELECT * FROM (
      SELECT dirname_path(path) AS folder_path, COUNT(*) AS file_count, MAX(mtime) AS max_mtime
      FROM file_index
      ${whereSql}
      GROUP BY dirname_path(path)
    )
    ${outerOrderSql}
    LIMIT ? OFFSET ?
    `,
  );
  const rawFolders = listStmt.all(...params, limit, offset) as Array<{
    folder_path: string;
    file_count: number;
    max_mtime: number;
  }>;
  const folders: FolderGroupSummaryRow[] = rawFolders.map((r) => ({
    folderPath: r.folder_path,
    fileCount: r.file_count,
    maxMtime: r.max_mtime,
  }));

  return { folders, total };
}

const DEFAULT_EXPLORER_SCAN_LIMIT = 35_000;

/** First segment under `cwdAbs` covering `filePathAbs` (null when the file sits directly inside `cwdAbs`). */
function explorerFirstLevelChildDir(filePathAbs: string, cwdAbs: string): string | null {
  const fp = path.normalize(filePathAbs);
  const cw = path.normalize(cwdAbs);
  if (path.dirname(fp).toLowerCase() === cw.toLowerCase()) return null;

  const rel = path.relative(cw, fp);
  if (!rel || rel.startsWith('..')) return null;
  const first = rel.split(path.sep).find(Boolean);
  if (!first) return null;
  return path.normalize(path.join(cw, first));
}

function breadcrumbPrefixesFromPath(normalizedPath: string): string[] {
  const out: string[] = [];
  let cur = normalizedPath;
  if (!cur) return [];
  for (; ;) {
    out.unshift(cur);
    const p = path.dirname(cur);
    if (p === cur) break;
    cur = p;
  }
  return out;
}

export type ExplorerFolderRow = {
  folderPath: string;
  name: string;
  fileCountRecursive: number;
  maxMtime: number;
};

export type BrowseExplorerDirectoryOptions = {
  /** Empty or omitted: root — top-level folder rollups (same as folder groups). */
  directoryPath?: string;
  scanPathLimit?: number;
  pathContains?: string;
  contentContains?: string;
  extension?: string;
  previewChars?: number;
  previewTailChars?: number;
  rootOffset?: number;
  rootLimit?: number;
  rootSortBy?: FolderGroupSortKey;
  rootSortDir?: BrowseFileIndexSortDirection;
  fileOffset?: number;
  fileLimit?: number;
  fileSortColumn?: FileIndexBrowseSortColumn;
  fileSortDir?: BrowseFileIndexSortDirection;
};

export type BrowseExplorerDirectoryResult = {
  mode: 'root' | 'dir';
  currentDirectory: string;
  parentDirectory: string | null;
  breadcrumbPrefixes: string[];
  folders: ExplorerFolderRow[];
  files: FileIndexBrowseRow[];
  totalRootFolders: number;
  totalFilesInDirectory: number;
  subtreeScanTruncated: boolean;
};

/**
 * Windows Explorer–style directory listing: at root, paginated folder rollups; inside a path,
 * immediate subfolders (from a bounded subtree scan) plus files whose parent dir matches exactly.
 */
export function browseExplorerDirectory(
  db: Database.Database,
  options: BrowseExplorerDirectoryOptions = {},
): BrowseExplorerDirectoryResult {
  ensureBrowseSqlFunctions(db);

  const filter = {
    pathContains: typeof options.pathContains === 'string' ? options.pathContains : undefined,
    contentContains: typeof options.contentContains === 'string' ? options.contentContains : undefined,
    extension: typeof options.extension === 'string' ? options.extension : undefined,
  };

  const previewChars = Math.min(
    Math.max(Number(options.previewChars) ?? 2000, 50),
    50_000,
  );
  const previewTailChars = Math.min(Math.max(Number(options.previewTailChars) ?? 280, 0), 8000);

  const dirRaw = typeof options.directoryPath === 'string' ? options.directoryPath.trim() : '';

  if (!dirRaw) {
    const rootLimit = Math.min(Math.max(Number(options.rootLimit) || 50, 1), 200);
    const rootOffset = Math.max(Number(options.rootOffset) || 0, 0);
    const { whereSql, params } = buildBrowseWhereParts(filter);

    const sortKey: FolderGroupSortKey =
      options.rootSortBy === 'files' || options.rootSortBy === 'recent'
        ? options.rootSortBy
        : 'folder';
    const dirIn: BrowseFileIndexSortDirection =
      options.rootSortDir === 'asc' || options.rootSortDir === 'desc'
        ? options.rootSortDir
        : 'desc';
    const asc = dirIn === 'asc';

    let outerOrderSql = asc
      ? 'ORDER BY folder_path COLLATE NOCASE ASC'
      : 'ORDER BY folder_path COLLATE NOCASE DESC';
    if (sortKey === 'files') {
      outerOrderSql = asc
        ? 'ORDER BY file_count ASC, folder_path COLLATE NOCASE ASC'
        : 'ORDER BY file_count DESC, folder_path COLLATE NOCASE ASC';
    }
    if (sortKey === 'recent') {
      outerOrderSql = asc
        ? 'ORDER BY max_mtime ASC, folder_path COLLATE NOCASE ASC'
        : 'ORDER BY max_mtime DESC, folder_path COLLATE NOCASE ASC';
    }

    const totalRow = db
      .prepare<unknown[], { cnt: number }>(
        `
        SELECT COUNT(*) AS cnt FROM (
          SELECT first_level_dir(path) AS fp
          FROM file_index
          ${whereSql}
          GROUP BY 1
        ) grouped
        WHERE fp <> ''
      `,
      )
      .get(...params);
    const total = totalRow?.cnt ?? 0;

    const listStmt = db.prepare(
      `
      SELECT folder_path, file_count, max_mtime FROM (
        SELECT first_level_dir(path) AS folder_path,
               COUNT(*) AS file_count,
               MAX(mtime) AS max_mtime
        FROM file_index
        ${whereSql}
        GROUP BY 1
      ) grouped
      WHERE folder_path <> ''
      ${outerOrderSql}
      LIMIT ? OFFSET ?
    `,
    );
    const rawFolders = listStmt.all(...params, rootLimit, rootOffset) as Array<{
      folder_path: string;
      file_count: number;
      max_mtime: number;
    }>;
    const mapped: ExplorerFolderRow[] = rawFolders.map((f) => ({
      folderPath: f.folder_path,
      name: path.basename(f.folder_path) || f.folder_path,
      fileCountRecursive: f.file_count,
      maxMtime: f.max_mtime,
    }));
    return {
      mode: 'root',
      currentDirectory: '',
      parentDirectory: null,
      breadcrumbPrefixes: [],
      folders: mapped,
      files: [],
      totalRootFolders: total,
      totalFilesInDirectory: 0,
      subtreeScanTruncated: false,
    };
  }

  const cwd = path.normalize(dirRaw);
  const parentDirname = path.dirname(cwd);
  const parentDirectory = parentDirname === cwd ? null : parentDirname;

  const scanLimit = Math.min(
    Math.max(Number(options.scanPathLimit) || DEFAULT_EXPLORER_SCAN_LIMIT, 1000),
    100_000,
  );

  const { whereSql: whereSubtree, params: paramsSubtree } = buildBrowseWhereParts({
    ...filter,
    folderPrefix: cwd,
  });

  const scanStmt = db.prepare(
    `SELECT path, mtime FROM file_index ${whereSubtree} LIMIT ?`,
  );
  const scanned = scanStmt.all(...paramsSubtree, scanLimit) as Array<{ path: string; mtime: number }>;
  const truncated = scanned.length >= scanLimit;

  const childAgg = new Map<string, { count: number; maxM: number }>();
  for (const row of scanned) {
    const child = explorerFirstLevelChildDir(row.path, cwd);
    if (!child) continue;
    const g = childAgg.get(child) ?? { count: 0, maxM: 0 };
    g.count += 1;
    g.maxM = Math.max(g.maxM, row.mtime);
    childAgg.set(child, g);
  }

  const explorerFolders: ExplorerFolderRow[] = [...childAgg.entries()]
    .map(([folderPath, g]) => ({
      folderPath,
      name: path.basename(folderPath) || folderPath,
      fileCountRecursive: g.count,
      maxMtime: g.maxM,
    }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );

  const fileLimit = Math.min(Math.max(Number(options.fileLimit) || 50, 1), 200);
  const fileOffset = Math.max(Number(options.fileOffset) || 0, 0);

  const fileRes = browseFileIndex(db, {
    ...filter,
    parentDirectory: cwd,
    limit: fileLimit,
    offset: fileOffset,
    previewChars,
    previewTailChars,
    sortColumn: options.fileSortColumn,
    sortDir: options.fileSortDir,
  });

  return {
    mode: 'dir',
    currentDirectory: cwd,
    parentDirectory,
    breadcrumbPrefixes: breadcrumbPrefixesFromPath(cwd),
    folders: explorerFolders,
    files: fileRes.rows,
    totalRootFolders: 0,
    totalFilesInDirectory: fileRes.total,
    subtreeScanTruncated: truncated,
  };
}

/** One indexed file row with optionally truncated extracted text (bounded read from SQLite). */
export type FileIndexDetailRow = Omit<IndexedFile, 'extension'> & {
  extension: string;
  contentTruncated: boolean;
};

const MAX_LOOKUP_PATH_CHARS = 32_768;
const DEFAULT_DETAIL_CONTENT_CAP = 600_000;

/**
 * Loads a single `file_index` row by primary key. Content is capped in SQL so multi‑MB rows
 * do not allocate full strings in Node.
 */
export function getFileIndexRow(
  db: Database.Database,
  filePath: string,
  maxContentChars = DEFAULT_DETAIL_CONTENT_CAP,
): FileIndexDetailRow | null {
  if (filePath.length === 0 || filePath.length > MAX_LOOKUP_PATH_CHARS) {
    return null;
  }
  const cap = Math.min(Math.max(maxContentChars, 100), 1_000_000);

  const row = db
    .prepare(
      `
      SELECT
        length(content) AS len,
        path,
        name,
        mtime,
        extension,
        tags,
        SUBSTR(content, 1, ?) AS slice
      FROM file_index
      WHERE path = ?
      `,
    )
    .get(cap, filePath) as
    | {
      len: number;
      path: string;
      name: string;
      mtime: number;
      extension: string | null;
      tags: string;
      slice: string;
    }
    | undefined;

  if (!row) return null;

  const contentTruncated = row.len > cap;
  const content = row.slice;

  return {
    path: row.path,
    name: row.name,
    mtime: row.mtime,
    extension: row.extension ?? '',
    tags: row.tags,
    content,
    contentTruncated,
  };
}

/** High-level status used by the `search:status` IPC channel. */
export function getStatus(db: Database.Database): {
  indexed: number;
  watching: boolean;
  lastRun: number;
} {
  const row = db
    .prepare<[], { cnt: number; last: number | null }>(
      'SELECT COUNT(*) AS cnt, MAX(mtime) AS last FROM file_index',
    )
    .get();
  return {
    indexed: row?.cnt ?? 0,
    watching: true,
    lastRun: row?.last ?? 0,
  };
}

/** 
 * Permanently deletes any files from the index that match the exemption list. 
 * Use this during startup or migration to clean up 'noise' from existing databases.
 */
export function purgeExemptedFiles(db: Database.Database): void {
  const exemptionFilter = DEFAULT_IGNORED_PATHS.map(() => `path LIKE ?`).join(' OR ');
  if (!exemptionFilter) return;

  const stmt = db.prepare(`DELETE FROM file_index WHERE ${exemptionFilter}`);
  const params = DEFAULT_IGNORED_PATHS.map(p => `%${path.sep}${p}${path.sep}%`);

  const result = stmt.run(...params);
  if (result.changes > 0) {
    console.info(`[search-db] Purged ${result.changes} exempted files from the index.`);
  }

  const vad = db.prepare(
    `DELETE FROM file_index WHERE instr(lower(replace(path, char(92), '/')), '/public/vad/') > 0`,
  );
  const vadResult = vad.run();
  if (vadResult.changes > 0) {
    console.info(`[search-db] Purged ${vadResult.changes} rows under public/vad from the index.`);
  }
}
