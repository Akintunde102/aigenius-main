export type CreateNamedProjectDirectoryResult =
  | { ok: true; path: string; created?: boolean }
  | { ok: true; canceled: true }
  | { ok: false; error: string };

export function resolveNameForNamedFolderCreate(
  currentName: string,
  generateName: () => string,
): { name: string; generated: boolean } {
  const trimmed = currentName.trim();
  if (trimmed) {
    return { name: trimmed, generated: false };
  }
  return { name: generateName(), generated: true };
}

export function applyCreateNamedFolderResult(
  result: CreateNamedProjectDirectoryResult | null | undefined,
): { status: 'filled'; path: string } | { status: 'canceled' } | { status: 'error'; message: string } {
  if (!result) {
    return { status: 'error', message: 'Could not create folder' };
  }
  if ('canceled' in result && result.canceled) {
    return { status: 'canceled' };
  }
  if (!result.ok) {
    return { status: 'error', message: result.error || 'Could not create folder' };
  }
  if ('path' in result && result.path) {
    return { status: 'filled', path: result.path };
  }
  return { status: 'error', message: 'Could not create folder' };
}
