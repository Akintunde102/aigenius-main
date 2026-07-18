/** Tracks files touched in the current desktop session for edit-impact hints. */
const touchedFiles = new Map<string, number>();

export function recordTouchedFile(filePath: string): void {
  if (!filePath) return;
  touchedFiles.set(filePath, Date.now());
  if (touchedFiles.size > 200) {
    const oldest = [...touchedFiles.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    if (oldest) touchedFiles.delete(oldest);
  }
}

export function getTouchedFilesSnapshot(): string[] {
  return [...touchedFiles.keys()].slice(-20);
}

export function formatEditSessionHint(): string | null {
  const files = getTouchedFilesSnapshot();
  if (!files.length) return null;
  return `Files edited this session: ${files.map((f) => `\`${f}\``).join(', ')}`;
}

export function clearEditSession(): void {
  touchedFiles.clear();
}
