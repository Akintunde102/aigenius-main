import fs from 'fs/promises';
import path from 'path';

export type CodeProjectRootCheckStatus =
  | 'ok'
  | 'missing'
  | 'not_directory'
  | 'permission_denied'
  | 'invalid_path';

export type CodeProjectRootCheckResult = {
  ok: boolean;
  status: CodeProjectRootCheckStatus;
  /** True when parent exists and target path is absent (safe to mkdir empty folder). */
  canRecreate: boolean;
  resolvedPath?: string;
};

export type CodeProjectRootFs = {
  stat: (target: string) => Promise<{ isDirectory(): boolean }>;
  access: (target: string, mode?: number) => Promise<void>;
};

export function normalizeProjectRootInput(rootPath: unknown): string | null {
  if (typeof rootPath !== 'string') {
    return null;
  }
  const trimmed = rootPath.trim();
  if (!trimmed) {
    return null;
  }
  if (!path.isAbsolute(trimmed)) {
    return null;
  }
  return path.resolve(trimmed);
}

/**
 * Verifies that a code project root exists and is a readable directory.
 */
export async function checkCodeProjectRootPath(
  rootPath: unknown,
  fsImpl?: CodeProjectRootFs,
): Promise<CodeProjectRootCheckResult> {
  const resolved = normalizeProjectRootInput(rootPath);
  if (!resolved) {
    return { ok: false, status: 'invalid_path', canRecreate: false };
  }

  const fs = fsImpl ?? defaultFs();
  try {
    const entry = await fs.stat(resolved);
    if (!entry.isDirectory()) {
      return { ok: false, status: 'not_directory', canRecreate: false, resolvedPath: resolved };
    }
    try {
      await fs.access(resolved);
    } catch (accessErr) {
      const code = (accessErr as NodeJS.ErrnoException)?.code;
      if (code === 'EACCES' || code === 'EPERM') {
        return {
          ok: false,
          status: 'permission_denied',
          canRecreate: false,
          resolvedPath: resolved,
        };
      }
      throw accessErr;
    }
    return { ok: true, status: 'ok', canRecreate: false, resolvedPath: resolved };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      const canRecreate = await canRecreateProjectRootAtPath(resolved, fs);
      return { ok: false, status: 'missing', canRecreate, resolvedPath: resolved };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return {
        ok: false,
        status: 'permission_denied',
        canRecreate: false,
        resolvedPath: resolved,
      };
    }
    return { ok: false, status: 'missing', canRecreate: false, resolvedPath: resolved };
  }
}

export async function canRecreateProjectRootAtPath(
  resolvedTarget: string,
  fsImpl?: CodeProjectRootFs,
): Promise<boolean> {
  const fs = fsImpl ?? defaultFs();
  const parent = path.dirname(resolvedTarget);
  if (!parent || parent === resolvedTarget) {
    return false;
  }
  try {
    const parentStat = await fs.stat(parent);
    if (!parentStat.isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    await fs.stat(resolvedTarget);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === 'ENOENT';
  }
}

function defaultFs(): CodeProjectRootFs {
  return {
    stat: (target) => fs.stat(target),
    access: (target, mode) => fs.access(target, mode),
  };
}
