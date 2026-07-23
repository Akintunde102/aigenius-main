import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type Database from 'better-sqlite3';
import { buildProjectArchitecture } from './db/queries-chunks.js';
import { browseExplorerDirectory } from './db/queries.js';

const MAX_TOP_LEVEL_ENTRIES = 60;
const GIT_TIMEOUT_MS = 4_000;
const ENTRY_POINT_NAMES = new Set([
  'package.json',
  'README.md',
  'readme.md',
  'Cargo.toml',
  'pyproject.toml',
  'go.mod',
  'Tiltfile',
  'docker-compose.yml',
  'Makefile',
  'apps',
  'src',
  'docs',
  'lib',
  'packages',
  '.github',
]);

export type DirectoryListingEntry = {
  name: string;
  kind: 'file' | 'directory';
  sizeBytes?: number;
  modifiedMs?: number;
  indexedFileCount?: number;
};

export type DirectorySnapshot = {
  path: string;
  entries: DirectoryListingEntry[];
  entryPoints: string[];
  truncated: boolean;
};

export type GitSnapshot = {
  isRepo: boolean;
  branch: string | null;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
  isDirty: boolean;
  changedFiles: number;
  statusShort: string | null;
  originUrl: string | null;
  headSummary: string | null;
};

export type ProjectOverviewPayload = {
  root: string;
  projectName: string;
  directory: DirectorySnapshot;
  git: GitSnapshot;
  architectureMarkdown: string;
  indexedFiles: number;
  indexedChunks: number;
};

export type DirectoryOverviewPayload = {
  path: string;
  directory: DirectorySnapshot;
  indexedFilesUnderPath: number;
};

function directoryExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/** Resolve repo-relative or absolute paths to an on-disk directory. */
export function resolveContextDirectoryPath(input: string, pathPrefix: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/\\/g, '/');
  const looksLikePath =
    normalized.includes('/') || path.isAbsolute(trimmed) || /^[A-Za-z]:/.test(trimmed);
  if (!looksLikePath) return null;

  const candidates: string[] = [];
  if (path.isAbsolute(trimmed)) {
    candidates.push(path.normalize(trimmed));
  }
  if (pathPrefix) {
    candidates.push(path.normalize(path.join(pathPrefix, trimmed)));
  }

  for (const candidate of candidates) {
    if (directoryExists(candidate)) return candidate;
  }
  return null;
}

export function isProjectRootDirectory(dirPath: string, pathPrefix: string): boolean {
  const normDir = path.normalize(dirPath);
  const normPrefix = pathPrefix ? path.normalize(pathPrefix) : '';
  if (normPrefix && normDir === normPrefix) return true;

  try {
    if (fs.existsSync(path.join(normDir, '.git'))) return true;
  } catch {
    /* ignore */
  }

  return false;
}

function runGit(args: string[], cwd: string): { ok: boolean; stdout: string } {
  try {
    const res = spawnSync('git', args, {
      cwd,
      encoding: 'utf8',
      timeout: GIT_TIMEOUT_MS,
      windowsHide: true,
    });
    if (res.error) return { ok: false, stdout: '' };
    if (res.status !== 0) return { ok: false, stdout: (res.stderr ?? '').trim() };
    return { ok: true, stdout: (res.stdout ?? '').trim() };
  } catch {
    return { ok: false, stdout: '' };
  }
}

function parseBranchTracking(headerLine: string): {
  branch: string | null;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
} {
  const body = headerLine.replace(/^##\s+/, '').trim();
  if (!body) return { branch: null, upstream: null, ahead: null, behind: null };

  const bracketIdx = body.indexOf('[');
  const head = bracketIdx >= 0 ? body.slice(0, bracketIdx).trim() : body;
  const bracket = bracketIdx >= 0 ? body.slice(bracketIdx) : '';

  const dotIdx = head.indexOf('...');
  const branch = (dotIdx >= 0 ? head.slice(0, dotIdx) : head).trim() || null;
  const upstream = dotIdx >= 0 ? head.slice(dotIdx + 3).trim() || null : null;

  let ahead: number | null = null;
  let behind: number | null = null;
  const aheadM = bracket.match(/ahead\s+(\d+)/i);
  const behindM = bracket.match(/behind\s+(\d+)/i);
  if (aheadM) ahead = Number(aheadM[1]);
  if (behindM) behind = Number(behindM[1]);

  return { branch, upstream, ahead, behind };
}

export function collectGitSnapshot(rootPath: string): GitSnapshot {
  const empty: GitSnapshot = {
    isRepo: false,
    branch: null,
    upstream: null,
    ahead: null,
    behind: null,
    isDirty: false,
    changedFiles: 0,
    statusShort: null,
    originUrl: null,
    headSummary: null,
  };

  const inside = runGit(['rev-parse', '--is-inside-work-tree'], rootPath);
  if (!inside.ok || inside.stdout !== 'true') return empty;

  const status = runGit(['status', '--short', '--branch'], rootPath);
  const lines = status.ok ? status.stdout.split('\n').filter(Boolean) : [];
  const header = lines.find((l) => l.startsWith('## ')) ?? '';
  const fileLines = lines.filter((l) => !l.startsWith('## '));
  const tracking = parseBranchTracking(header);

  const origin = runGit(['remote', 'get-url', 'origin'], rootPath);
  const head = runGit(['log', '-1', '--oneline'], rootPath);

  return {
    isRepo: true,
    branch: tracking.branch,
    upstream: tracking.upstream,
    ahead: tracking.ahead,
    behind: tracking.behind,
    isDirty: fileLines.length > 0,
    changedFiles: fileLines.length,
    statusShort: fileLines.length ? fileLines.slice(0, 25).join('\n') : null,
    originUrl: origin.ok && origin.stdout ? origin.stdout : null,
    headSummary: head.ok && head.stdout ? head.stdout : null,
  };
}

function listFilesystemChildren(dirPath: string): { entries: DirectoryListingEntry[]; truncated: boolean } {
  let names: string[] = [];
  try {
    names = fs.readdirSync(dirPath);
  } catch {
    return { entries: [], truncated: false };
  }

  const sorted = names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const truncated = sorted.length > MAX_TOP_LEVEL_ENTRIES;
  const slice = sorted.slice(0, MAX_TOP_LEVEL_ENTRIES);

  const entries: DirectoryListingEntry[] = [];
  for (const name of slice) {
    const full = path.join(dirPath, name);
    try {
      const stat = fs.statSync(full);
      entries.push({
        name,
        kind: stat.isDirectory() ? 'directory' : 'file',
        sizeBytes: stat.isFile() ? stat.size : undefined,
        modifiedMs: Math.floor(stat.mtimeMs),
      });
    } catch {
      entries.push({ name, kind: 'file' });
    }
  }

  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return { entries, truncated };
}

function mergeIndexedFolderCounts(
  entries: DirectoryListingEntry[],
  indexedFolders: Array<{ folderPath: string; fileCountRecursive: number }>,
  dirPath: string,
): DirectoryListingEntry[] {
  const normDir = path.normalize(dirPath);
  const byName = new Map(entries.map((e) => [e.name, { ...e }]));

  for (const folder of indexedFolders) {
    const parent = path.normalize(path.dirname(folder.folderPath));
    if (parent !== normDir) continue;
    const name = path.basename(folder.folderPath);
    const existing = byName.get(name);
    if (existing?.kind === 'directory') {
      existing.indexedFileCount = folder.fileCountRecursive;
    } else if (!existing) {
      byName.set(name, {
        name,
        kind: 'directory',
        indexedFileCount: folder.fileCountRecursive,
      });
    }
  }

  return [...byName.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function buildDirectorySnapshot(db: Database.Database, dirPath: string): DirectorySnapshot {
  const norm = path.normalize(dirPath);
  const { entries, truncated } = listFilesystemChildren(norm);

  let merged = entries;
  try {
    const explorer = browseExplorerDirectory(db, {
      directoryPath: norm,
      fileLimit: 40,
      scanPathLimit: 5_000,
    });
    if (explorer.mode === 'dir') {
      merged = mergeIndexedFolderCounts(entries, explorer.folders, norm);
    }
  } catch {
    /* index browse optional */
  }

  const entryPoints = merged
    .filter((e) => ENTRY_POINT_NAMES.has(e.name))
    .map((e) => (e.kind === 'directory' ? `${e.name}/` : e.name));

  return {
    path: norm,
    entries: merged,
    entryPoints,
    truncated,
  };
}

function countIndexedUnder(db: Database.Database, prefix: string): number {
  const norm = path.normalize(prefix);
  const row = db
    .prepare(`SELECT COUNT(*) AS cnt FROM file_index WHERE path LIKE ? || '%'`)
    .get(norm) as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export function buildProjectOverview(
  db: Database.Database,
  rootPath: string,
): ProjectOverviewPayload {
  const norm = path.normalize(rootPath);
  const projectName = path.basename(norm) || 'project';
  const architectureMarkdown = buildProjectArchitecture(db, norm, projectName);

  const indexedFiles = countIndexedUnder(db, norm);
  const chunkRow = db
    .prepare(`SELECT COUNT(*) AS cnt FROM file_chunks WHERE path LIKE ? || '%'`)
    .get(norm) as { cnt: number } | undefined;

  return {
    root: norm,
    projectName,
    directory: buildDirectorySnapshot(db, norm),
    git: collectGitSnapshot(norm),
    architectureMarkdown,
    indexedFiles,
    indexedChunks: chunkRow?.cnt ?? 0,
  };
}

export function buildDirectoryOverview(
  db: Database.Database,
  dirPath: string,
): DirectoryOverviewPayload {
  const norm = path.normalize(dirPath);
  return {
    path: norm,
    directory: buildDirectorySnapshot(db, norm),
    indexedFilesUnderPath: countIndexedUnder(db, norm),
  };
}
