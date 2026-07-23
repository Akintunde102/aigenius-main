import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getActiveCodeProjectRootPath } from '../../active-code-project';

export type PathResolveResult =
  | { ok: true; resolved: string; displayPath: string }
  | { ok: false; error: string };

function workspaceRoot(): string {
  return path.resolve(getActiveCodeProjectRootPath() ?? os.homedir());
}

function isDescendantOf(root: string, candidate: string): boolean {
  const normRoot = path.normalize(root);
  const normCandidate = path.normalize(candidate);
  if (normCandidate === normRoot) return true;
  const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
  return normCandidate.startsWith(prefix);
}

/**
 * Resolve a workspace-relative or absolute path under the active project root.
 * Uses realpath to defeat symlink escapes.
 */
export async function resolveReadFilePath(inputPath: string): Promise<PathResolveResult> {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: 'Error: file not found — path is required' };
  }

  const root = workspaceRoot();
  const trimmed = inputPath.trim();
  const joined = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(root, trimmed);

  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return { ok: false, error: `Error: file not found — ${trimmed}` };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { ok: false, error: `Error: read failed — permission denied for ${trimmed}` };
    }
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!isDescendantOf(root, real)) {
    return { ok: false, error: 'Error: access denied — path resolves outside workspace root' };
  }

  let stat;
  try {
    stat = await fs.stat(real);
  } catch (e: unknown) {
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!stat.isFile()) {
    return { ok: false, error: `Error: file not found — ${trimmed} (not a file)` };
  }

  const displayPath = path.isAbsolute(trimmed)
    ? trimmed
    : path.relative(root, real).split(path.sep).join('/');

  return { ok: true, resolved: real, displayPath };
}
