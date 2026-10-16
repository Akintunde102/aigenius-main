import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { shouldSkipSearchIndexingRelative } from './exemptions.js';
import { loadAigeniusIgnorePatterns } from './project-walk.js';

/** Names we expect users to need early — keep aligned with project-root-snapshot ENTRY_POINT_NAMES. */
export const FAST_POCKET_ENTRY_NAMES = new Set([
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

const MAX_POCKET_FILES = 400;
const MAX_DEPTH_UNDER_ENTRY = 3;
const MAX_FILES_PER_ENTRY_DIR = 120;

const dynamicPocketByDb = new Map<string, Set<string>>();

export function rememberPocketPaths(dbPath: string, filePaths: string[]): void {
  const normDb = path.normalize(dbPath);
  let set = dynamicPocketByDb.get(normDb);
  if (!set) {
    set = new Set();
    dynamicPocketByDb.set(normDb, set);
  }
  for (const p of filePaths) {
    if (p?.trim()) set.add(path.normalize(p));
  }
}

export function getRememberedPocketPaths(dbPath: string): string[] {
  const set = dynamicPocketByDb.get(path.normalize(dbPath));
  return set ? [...set] : [];
}

function shouldSkipUnderRoot(absPath: string, projectRoot: string, patterns: string[]): boolean {
  const rel = path.relative(projectRoot, absPath).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return true;
  return shouldSkipSearchIndexingRelative(rel) || patterns.some((pat) => matchesIgnorePattern(rel, pat));
}

function matchesIgnorePattern(relPath: string, pattern: string): boolean {
  const norm = relPath.replace(/\\/g, '/');
  const p = pattern.replace(/\\/g, '/');
  if (p.endsWith('/')) {
    return norm.includes(p.slice(0, -1));
  }
  if (p.includes('*')) {
    const escaped = p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`(^|/)${escaped}($|/)`).test(norm);
  }
  return norm === p || norm.endsWith(`/${p}`) || norm.includes(`/${p}/`);
}

function collectShallowFiles(
  dirPath: string,
  projectRoot: string,
  patterns: string[],
  out: string[],
  depth: number,
): void {
  if (out.length >= MAX_POCKET_FILES || depth > MAX_DEPTH_UNDER_ENTRY) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  let addedHere = 0;
  for (const ent of entries) {
    if (out.length >= MAX_POCKET_FILES || addedHere >= MAX_FILES_PER_ENTRY_DIR) break;
    const abs = path.join(dirPath, ent.name);
    if (shouldSkipUnderRoot(abs, projectRoot, patterns)) continue;
    if (ent.isFile()) {
      out.push(abs);
      addedHere += 1;
    } else if (ent.isDirectory()) {
      collectShallowFiles(abs, projectRoot, patterns, out, depth + 1);
    }
  }
}

/**
 * Files we believe the user needs indexed first: repo entry points, git-changed paths, and explicit hints.
 */
export function collectFastIndexPocketPaths(
  projectRoot: string,
  extraPaths: string[] = [],
): string[] {
  const root = path.resolve(projectRoot);
  const patterns = loadAigeniusIgnorePatterns(root);
  const seen = new Set<string>();
  const ordered: string[] = [];

  function add(absPath: string): void {
    const norm = path.normalize(absPath);
    if (seen.has(norm)) return;
    if (shouldSkipUnderRoot(norm, root, patterns)) return;
    try {
      if (!fs.statSync(norm).isFile()) return;
    } catch {
      return;
    }
    seen.add(norm);
    ordered.push(norm);
  }

  for (const p of extraPaths) {
    if (ordered.length >= MAX_POCKET_FILES) break;
    add(p);
  }

  let rootNames: string[] = [];
  try {
    rootNames = fs.readdirSync(root);
  } catch {
    return ordered;
  }

  for (const name of rootNames) {
    if (ordered.length >= MAX_POCKET_FILES) break;
    if (!FAST_POCKET_ENTRY_NAMES.has(name)) continue;
    const abs = path.join(root, name);
    if (shouldSkipUnderRoot(abs, root, patterns)) continue;
    try {
      const stat = fs.statSync(abs);
      if (stat.isFile()) {
        add(abs);
      } else if (stat.isDirectory()) {
        collectShallowFiles(abs, root, patterns, ordered, 0);
      }
    } catch {
      /* skip missing entry */
    }
  }

  for (const rel of collectGitChangedRelativePaths(root)) {
    if (ordered.length >= MAX_POCKET_FILES) break;
    add(path.join(root, rel));
  }

  return ordered.slice(0, MAX_POCKET_FILES);
}

function collectGitChangedRelativePaths(projectRoot: string): string[] {
  const gitDir = path.join(projectRoot, '.git');
  try {
    if (!fs.existsSync(gitDir)) return [];
  } catch {
    return [];
  }

  const result = spawnSync(
    'git',
    ['status', '--porcelain', '-z', '--untracked-files=normal'],
    {
      cwd: projectRoot,
      encoding: 'buffer',
      timeout: 8_000,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0 || !result.stdout?.length) return [];

  const raw = result.stdout;
  const rels: string[] = [];
  let start = 0;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== 0) continue;
    if (i > start) {
      const line = raw.subarray(start, i).toString('utf8');
      const pathPart = line.slice(3).trim();
      if (pathPart) rels.push(pathPart.replace(/\\/g, '/'));
    }
    start = i + 1;
  }
  return rels;
}
