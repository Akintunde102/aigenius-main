import type Database from 'better-sqlite3';
import {
  buildBrowseWhereParts,
  ensureBrowseSqlFunctions,
} from './queries-browse-shared.js';

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
