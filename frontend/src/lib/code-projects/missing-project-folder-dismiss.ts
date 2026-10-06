const STORAGE_KEY = 'aigenius-missing-folder-dismiss-v1';

export type MissingFolderDismissMap = Record<string, string>;

function readMap(): MissingFolderDismissMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    const out: MissingFolderDismissMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key === 'string' && typeof value === 'string') {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: MissingFolderDismissMap): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

export function isMissingFolderDismissed(projectId: string): boolean {
  if (!projectId) {
    return false;
  }
  return Boolean(readMap()[projectId]);
}

export function dismissMissingFolderPrompt(projectId: string): void {
  if (!projectId) {
    return;
  }
  const map = readMap();
  map[projectId] = new Date().toISOString();
  writeMap(map);
}

export function clearMissingFolderDismiss(projectId: string): void {
  if (!projectId) {
    return;
  }
  const map = readMap();
  if (!(projectId in map)) {
    return;
  }
  delete map[projectId];
  writeMap(map);
}

/** For tests */
export function resetMissingFolderDismissStorageForTests(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function shouldPromptMissingFolderModal(options: {
  projectId: string;
  isDesktop: boolean;
  rootOk: boolean;
  isActiveProject: boolean;
  dismissed: boolean;
}): boolean {
  if (!options.isDesktop || !options.projectId || options.rootOk) {
    return false;
  }
  if (!options.isActiveProject) {
    return false;
  }
  return !options.dismissed;
}
