import path from 'path';

export const DEFAULT_IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.next',
  '.idea',
  '.vscode',
  'dist',
  'build',
  'AppData',
  'Program Files',
  'Program Files (x86)',
  'System32',
  'Library',
  'System',
  'Volumes',
].map(p => p.toLowerCase());

export function isIgnored(filePath: string): boolean {
  if (!filePath) return false;
  const parts = filePath.toLowerCase().split(/[\\/]/);
  return DEFAULT_IGNORED_PATHS.some((ignored) => parts.includes(ignored));
}

/** Ignore node_modules (etc.) under the listed folder, not ignored ancestor segments like AppData. */
export function isIgnoredUnderRoot(rootDir: string, itemPath: string): boolean {
  if (!itemPath) return false;
  const relative = path.relative(rootDir, itemPath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return isIgnored(itemPath);
  }
  return isIgnored(relative);
}
