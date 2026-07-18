import fs from 'fs';
import path from 'path';
import { shouldSkipSearchIndexingRelative } from './exemptions.js';

const MAX_PROJECT_WALK_FILES = 50_000;

/**
 * Optional `.aigeniusignore` at project root (gitignore-style lines).
 */
export function loadAigeniusIgnorePatterns(projectRoot: string): string[] {
  const ignorePath = path.join(projectRoot, '.aigeniusignore');
  try {
    const raw = fs.readFileSync(ignorePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
  } catch {
    return [];
  }
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

function shouldSkipWithPatterns(absPath: string, projectRoot: string, patterns: string[]): boolean {
  const rel = path.relative(projectRoot, absPath).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..')) return true;
  if (shouldSkipSearchIndexingRelative(rel)) return true;
  return patterns.some((pat) => matchesIgnorePattern(rel, pat));
}

/**
 * Collect indexable file paths under a project root (bounded).
 */
export function walkProjectFiles(projectRoot: string, extraIgnore: string[] = []): string[] {
  const root = path.resolve(projectRoot);
  const patterns = [...loadAigeniusIgnorePatterns(root), ...extraIgnore];
  const out: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0 && out.length < MAX_PROJECT_WALK_FILES) {
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      if (shouldSkipWithPatterns(abs, root, patterns)) continue;
      if (ent.isDirectory()) {
        stack.push(abs);
      } else if (ent.isFile()) {
        out.push(abs);
      }
    }
  }

  return out;
}
