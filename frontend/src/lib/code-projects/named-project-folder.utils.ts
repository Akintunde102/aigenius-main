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

export function deriveProjectNameFromPath(
  folderPath: string,
  existingProjects?: Array<{ name: string; rootPath?: string }> | string[],
): string {
  if (!folderPath || !folderPath.trim()) {
    return '';
  }

  const normalized = folderPath.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const rawSegments = normalized.split('/').filter(Boolean);
  if (rawSegments.length === 0) {
    return '';
  }

  let cleanSegments = rawSegments;
  if (rawSegments.length > 1 && /^[a-zA-Z]:$/.test(rawSegments[0])) {
    cleanSegments = rawSegments.slice(1);
  } else if (rawSegments.length === 1 && /^[a-zA-Z]:$/.test(rawSegments[0])) {
    return '';
  }

  if (cleanSegments.length === 0) {
    return '';
  }

  const existingNames = new Set<string>();
  if (existingProjects) {
    for (const item of existingProjects) {
      const nameStr = typeof item === 'string' ? item : item.name;
      if (nameStr && nameStr.trim()) {
        existingNames.add(nameStr.trim().toLowerCase());
      }
    }
  }

  for (let depth = 1; depth <= cleanSegments.length; depth++) {
    const candidateSegments = cleanSegments.slice(cleanSegments.length - depth);
    const candidateName = candidateSegments.join('/');

    if (!existingNames.has(candidateName.toLowerCase())) {
      return candidateName;
    }
  }

  const baseName = cleanSegments.join('/');
  let suffix = 2;
  while (existingNames.has(`${baseName} (${suffix})`.toLowerCase())) {
    suffix++;
  }
  return `${baseName} (${suffix})`;
}

