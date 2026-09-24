export function normalizeCodeProjectRootPath(rootPath: string): string {
  return rootPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
}

export function codeProjectRootPathsEqual(a: string, b: string): boolean {
  const left = normalizeCodeProjectRootPath(a);
  const right = normalizeCodeProjectRootPath(b);
  if (!left || !right) {
    return false;
  }
  const looksWindows = /^[a-zA-Z]:/.test(left) || /^[a-zA-Z]:/.test(right) || a.includes('\\') || b.includes('\\');
  if (looksWindows) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}
