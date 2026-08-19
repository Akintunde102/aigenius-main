import path from 'path';
import type Database from 'better-sqlite3';

/** Escapes `%`, `_`, `\` for `LIKE ... ESCAPE '\\'`. */
export function escapeSqlLikeFragment(value: string): string {
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
export function buildBrowseWhereParts(filters: {
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
