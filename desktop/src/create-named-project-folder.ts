import fs from 'fs';
import path from 'path';

const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

const MAX_FOLDER_NAME_LENGTH = 255;

export type PathJoinImpl = {
  join: (...parts: string[]) => string;
  resolve: (...parts: string[]) => string;
  isAbsolute: (p: string) => boolean;
  sep: string;
};

export type CreateNamedProjectFolderFs = {
  mkdir: (target: string, options: { recursive: boolean }) => Promise<string | undefined>;
  stat: (target: string) => Promise<{ isDirectory(): boolean }>;
};

export type CreateNamedProjectDirectoryResult =
  | { ok: true; path: string; created: boolean }
  | { ok: true; canceled: true }
  | { ok: false; error: string };

export type OpenDirectoryDialogResult = {
  canceled: boolean;
  filePaths: string[];
};

export type OpenDirectoryDialogOptions = {
  title: string;
  message: string;
  buttonLabel: string;
  defaultPath: string;
  properties: Array<'openDirectory' | 'createDirectory'>;
};

/**
 * Turns a project label into a single path segment that is valid on Windows, macOS, and Linux.
 * Returns null when nothing safe remains.
 */
export function sanitizeProjectFolderName(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  let name = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-');
  name = name
    .replace(/[.-]{2,}/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+/, '')
    .replace(/[.\s-]+$/, '');

  if (!name || name === '.' || name === '..') {
    return null;
  }

  if (name.length > MAX_FOLDER_NAME_LENGTH) {
    name = name.slice(0, MAX_FOLDER_NAME_LENGTH).replace(/[.\s-]+$/, '');
    if (!name) {
      return null;
    }
  }

  const reservedBase = name.split('.')[0]?.toUpperCase() ?? '';
  if (WINDOWS_RESERVED_NAMES.has(name.toUpperCase()) || WINDOWS_RESERVED_NAMES.has(reservedBase)) {
    return `${name}-project`;
  }

  return name;
}

export function isPathInsideParent(
  parentDir: string,
  childPath: string,
  pathImpl: Pick<PathJoinImpl, 'sep'>,
): boolean {
  const sep = pathImpl.sep;
  const normalize = (value: string) => {
    const swapped = sep === '\\' ? value.replace(/\//g, '\\') : value;
    const folded = sep === '\\' ? swapped.toLowerCase() : swapped;
    if (folded.length <= 1 || !folded.endsWith(sep)) {
      return folded;
    }
    return folded.slice(0, -sep.length);
  };

  const parent = normalize(parentDir);
  const child = normalize(childPath);
  return child === parent || child.startsWith(`${parent}${sep}`);
}

export function joinNamedProjectFolderPath(
  parentDir: string,
  folderName: string,
  pathImpl: Pick<PathJoinImpl, 'join'> = path,
): string {
  return pathImpl.join(parentDir, folderName);
}

export async function createNamedProjectFolder(options: {
  parentDir: string;
  folderName: string;
  pathImpl?: PathJoinImpl;
  fsImpl?: CreateNamedProjectFolderFs;
}): Promise<CreateNamedProjectDirectoryResult> {
  const pathImpl = options.pathImpl ?? path;
  const fsImpl = options.fsImpl ?? {
    mkdir: (target, mkdirOptions) => fs.promises.mkdir(target, mkdirOptions),
    stat: (target) => fs.promises.stat(target),
  };

  const folderName = sanitizeProjectFolderName(options.folderName);
  if (!folderName) {
    return { ok: false, error: 'Enter a valid project name first' };
  }

  const parentDir = options.parentDir.trim();
  if (!parentDir || !pathImpl.isAbsolute(parentDir)) {
    return { ok: false, error: 'Choose a folder to create the project in' };
  }

  const target = joinNamedProjectFolderPath(parentDir, folderName, pathImpl);
  const resolvedParent = pathImpl.resolve(parentDir);
  const resolvedTarget = pathImpl.resolve(target);

  if (!isPathInsideParent(resolvedParent, resolvedTarget, pathImpl)) {
    return { ok: false, error: 'Could not create that folder name in the chosen location' };
  }

  try {
    const existing = await fsImpl.stat(resolvedTarget);
    if (existing.isDirectory()) {
      return { ok: true, path: resolvedTarget, created: false };
    }
    return { ok: false, error: 'A file already exists at that path' };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code && code !== 'ENOENT') {
      return { ok: false, error: friendlyFsError(error) };
    }
  }

  try {
    await fsImpl.mkdir(resolvedTarget, { recursive: true });
    return { ok: true, path: resolvedTarget, created: true };
  } catch (error) {
    return { ok: false, error: friendlyFsError(error) };
  }
}

export async function runCreateNamedProjectDirectoryRequest(input: {
  folderName: unknown;
  documentsPath: string;
  showOpenDialog: (options: OpenDirectoryDialogOptions) => Promise<OpenDirectoryDialogResult>;
  createFolder?: typeof createNamedProjectFolder;
}): Promise<CreateNamedProjectDirectoryResult> {
  const folderName = sanitizeProjectFolderName(input.folderName);
  if (!folderName) {
    return { ok: false, error: 'Enter a valid project name first' };
  }

  const dialogResult = await input.showOpenDialog({
    title: `Choose where to create “${folderName}”`,
    message: `A new folder named “${folderName}” will be created inside the location you pick.`,
    buttonLabel: 'Create folder here',
    defaultPath: input.documentsPath,
    properties: ['openDirectory', 'createDirectory'],
  });

  if (dialogResult.canceled || !dialogResult.filePaths[0]) {
    return { ok: true, canceled: true };
  }

  const createFolder = input.createFolder ?? createNamedProjectFolder;
  return createFolder({
    parentDir: dialogResult.filePaths[0],
    folderName,
  });
}

function friendlyFsError(error: unknown): string {
  const code = (error as NodeJS.ErrnoException)?.code;
  if (code === 'EACCES' || code === 'EPERM') {
    return 'Permission denied creating that folder';
  }
  if (code === 'ENAMETOOLONG') {
    return 'That folder path is too long';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Could not create folder';
}
