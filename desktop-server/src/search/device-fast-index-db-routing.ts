import path from 'path';
import { listDeviceFastIndexRoots } from './indexer/device-fast-index-pocket.js';

function homedirIndexDbPath(userData: string): string {
  return path.join(userData, 'homedir-index.sqlite');
}

export function isPathUnderAnyRoot(filePath: string, roots: string[]): boolean {
  const norm = path.normalize(filePath);
  for (const root of roots) {
    const normRoot = path.normalize(root);
    if (process.platform === 'win32') {
      const rel = path.relative(normRoot.toLowerCase(), norm.toLowerCase());
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;
    } else {
      const rel = path.relative(normRoot, norm);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;
    }
  }
  return false;
}

/**
 * When a query targets Desktop/Documents/Downloads (or Hy3 folders), use homedir-index.sqlite.
 */
export function resolveHomedirDbPathForDeviceFastIndex(
  userData: string,
  candidates: Array<string | undefined>,
): string | null {
  if (!userData?.trim()) return null;
  const roots = listDeviceFastIndexRoots(userData);
  if (!roots.length) return null;

  for (const candidate of candidates) {
    if (!candidate?.trim()) continue;
    const trimmed = path.normalize(candidate.trim());
    if (isPathUnderAnyRoot(trimmed, roots)) {
      return homedirIndexDbPath(userData);
    }
  }
  return null;
}
