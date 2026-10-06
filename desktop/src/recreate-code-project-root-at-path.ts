import fs from 'fs/promises';
import {
  canRecreateProjectRootAtPath,
  checkCodeProjectRootPath,
  normalizeProjectRootInput,
  type CodeProjectRootFs,
} from './check-code-project-root-path';

export type RecreateProjectRootResult =
  | { ok: true; path: string; created: boolean }
  | { ok: false; error: string };

export type RecreateProjectRootFs = CodeProjectRootFs & {
  mkdir: (target: string, options: { recursive: boolean }) => Promise<string | undefined>;
};

/**
 * Creates an empty directory at the stored project root when the parent exists and the target is absent.
 */
export async function recreateCodeProjectRootAtPath(
  rootPath: unknown,
  fsImpl?: RecreateProjectRootFs,
): Promise<RecreateProjectRootResult> {
  const resolved = normalizeProjectRootInput(rootPath);
  if (!resolved) {
    return { ok: false, error: 'Invalid project folder path' };
  }

  const fs = fsImpl ?? defaultFs();
  const check = await checkCodeProjectRootPath(resolved, fs);
  if (check.ok) {
    return { ok: true, path: resolved, created: false };
  }
  if (check.status === 'not_directory') {
    return { ok: false, error: 'A file already exists at that path' };
  }
  if (check.status === 'permission_denied') {
    return { ok: false, error: 'Permission denied accessing that folder' };
  }
  if (check.status !== 'missing') {
    return { ok: false, error: 'Could not recreate project folder' };
  }

  const canRecreate = await canRecreateProjectRootAtPath(resolved, fs);
  if (!canRecreate) {
    return {
      ok: false,
      error: 'Cannot recreate folder — parent directory is missing or path is unavailable',
    };
  }

  try {
    await fs.mkdir(resolved, { recursive: false });
    return { ok: true, path: resolved, created: true };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'EEXIST') {
      const after = await checkCodeProjectRootPath(resolved, fs);
      if (after.ok) {
        return { ok: true, path: resolved, created: false };
      }
      return { ok: false, error: 'A file already exists at that path' };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { ok: false, error: 'Permission denied creating that folder' };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Could not create folder',
    };
  }
}

function defaultFs(): RecreateProjectRootFs {
  return {
    stat: (target) => fs.stat(target),
    access: (target, mode) => fs.access(target, mode),
    mkdir: (target, options) => fs.mkdir(target, options),
  };
}
