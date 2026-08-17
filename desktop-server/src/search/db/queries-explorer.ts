import path from 'path';
import type Database from 'better-sqlite3';
import {
  browseFileIndex,
  browseFolderGroups,
  type BrowseFileIndexSortDirection,
  type FileIndexBrowseRow,
  type FileIndexBrowseSortColumn,
  type FolderGroupSortKey,
} from './queries-browse.js';
import {
  buildBrowseWhereParts,
  ensureBrowseSqlFunctions,
} from './queries-browse-shared.js';

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
