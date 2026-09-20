import path from 'path';

/** Tracks files touched in the current desktop session for edit-impact hints. */
const touchedFiles = new Map<string, number>();

export function recordTouchedFile(filePath: string): void {
  if (!filePath) return;
  touchedFiles.set(path.resolve(filePath), Date.now());
  if (touchedFiles.size > 200) {
    const oldest = [...touchedFiles.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    if (oldest) touchedFiles.delete(oldest);
  }
}

function normalizePathForComparison(p: string): string {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function getTouchedFilesSnapshot(projectRootPath?: string): string[] {
  const entries = [...touchedFiles.keys()];
  if (!projectRootPath) {
    return entries.slice(-20);
  }

  const rootNormalized = normalizePathForComparison(projectRootPath);
  const rootWithSep = rootNormalized.endsWith(path.sep) ? rootNormalized : rootNormalized + path.sep;

  const filtered = entries.filter((filePath) => {
    const fileNormalized = normalizePathForComparison(filePath);
    return fileNormalized === rootNormalized || fileNormalized.startsWith(rootWithSep);
  });

  return filtered.slice(-20);
}

export function formatEditSessionHint(projectRootPath?: string): string | null {
  const files = getTouchedFilesSnapshot(projectRootPath);
  if (!files.length) return null;
  return `Files edited this session: ${files.map((f) => `\`${f}\``).join(', ')}`;
}

export function clearEditSession(): void {
  touchedFiles.clear();
}

