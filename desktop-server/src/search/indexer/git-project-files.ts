import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { walkProjectFiles } from './project-walk.js';
import { shouldSkipSearchIndexingRelative } from './exemptions.js';

const GIT_TIMEOUT_MS = 15_000;

/**
 * Prefer `git ls-files` in a repo (tracked files only); fall back to directory walk.
 */
export function listProjectFiles(projectRoot: string, extraIgnore: string[] = []): string[] {
  const root = path.resolve(projectRoot);
  const fromGit = tryGitLsFiles(root);
  if (fromGit.length > 0) {
    return fromGit.filter((abs) => {
      const rel = path.relative(root, abs).replace(/\\/g, '/');
      if (!rel || rel.startsWith('..')) return false;
      return !shouldSkipSearchIndexingRelative(rel);
    });
  }
  return walkProjectFiles(root, extraIgnore);
}

function tryGitLsFiles(projectRoot: string): string[] {
  const gitDir = path.join(projectRoot, '.git');
  try {
    if (!fs.existsSync(gitDir)) return [];
  } catch {
    return [];
  }

  const result = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: projectRoot,
    encoding: 'buffer',
    timeout: GIT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.error || result.status !== 0) return [];

  const raw = result.stdout;
  if (!raw?.length) return [];

  const paths: string[] = [];
  let start = 0;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== 0) continue;
    if (i > start) {
      const rel = raw.subarray(start, i).toString('utf8');
      if (rel) paths.push(path.resolve(projectRoot, rel));
    }
    start = i + 1;
  }
  return paths;
}
