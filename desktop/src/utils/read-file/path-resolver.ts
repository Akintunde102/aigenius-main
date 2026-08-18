import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { getActiveCodeProjectRootPath } from '../../active-code-project';
import { isImageExtension, formatSupportedImageExtensions } from '../image-extensions';

export type PathResolveResult =
  | { ok: true; resolved: string; displayPath: string }
  | { ok: false; error: string };

function workspaceRoot(): string {
  return path.resolve(getActiveCodeProjectRootPath() ?? os.homedir());
}

function normalizePathForComparison(p: string): string {
  const norm = path.normalize(p);
  return process.platform === 'win32' ? norm.toLowerCase() : norm;
}

function isDescendantOf(root: string, candidate: string): boolean {
  const normRoot = normalizePathForComparison(root);
  const normCandidate = normalizePathForComparison(candidate);
  if (normCandidate === normRoot) return true;
  const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
  return normCandidate.startsWith(prefix);
}

async function resolveWorkspaceRootReal(): Promise<string> {
  const root = workspaceRoot();
  try {
    return await fs.realpath(root);
  } catch {
    return root;
  }
}

function outsideWorkspaceError(workspaceRootPath: string): string {
  return `Error: access denied — path resolves outside workspace root (${workspaceRootPath})`;
}

/**
 * Resolve a workspace-relative or absolute file path.
 * Absolute paths may point anywhere on the machine (same policy as `local_read_image`).
 * Relative paths stay scoped to the active project root.
 * Uses realpath to defeat symlink escapes.
 */
export async function resolveReadFilePath(inputPath: string): Promise<PathResolveResult> {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: 'Error: file not found — path is required' };
  }

  const root = workspaceRoot();
  const rootReal = await resolveWorkspaceRootReal();
  const trimmed = inputPath.trim();
  const joined = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(root, trimmed);

  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return { ok: false, error: `Error: file not found — ${trimmed}` };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { ok: false, error: `Error: read failed — permission denied for ${trimmed}` };
    }
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!path.isAbsolute(trimmed) && !isDescendantOf(rootReal, real)) {
    return { ok: false, error: outsideWorkspaceError(root) };
  }

  let stat;
  try {
    stat = await fs.stat(real);
  } catch (e: unknown) {
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!stat.isFile()) {
    return { ok: false, error: `Error: file not found — ${trimmed} (not a file)` };
  }

  const displayPath = path.isAbsolute(trimmed)
    ? trimmed
    : path.relative(root, real).split(path.sep).join('/');

  return { ok: true, resolved: real, displayPath };
}

/**
 * Resolve a directory path for `local_list_directory`.
 * Absolute paths may point anywhere on the user's machine (Desktop, Downloads, etc.).
 * Relative paths stay scoped to the active project root.
 */
export async function resolveDirectoryPath(inputPath: string): Promise<PathResolveResult> {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: 'Error: directory not found — path is required' };
  }

  const root = workspaceRoot();
  const rootReal = await resolveWorkspaceRootReal();
  const trimmed = inputPath.trim();
  const joined = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(root, trimmed);

  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return { ok: false, error: `Error: directory not found — ${trimmed}` };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { ok: false, error: `Error: read failed — permission denied for ${trimmed}` };
    }
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!path.isAbsolute(trimmed) && !isDescendantOf(rootReal, real)) {
    return { ok: false, error: outsideWorkspaceError(root) };
  }

  let stat;
  try {
    stat = await fs.stat(real);
  } catch (e: unknown) {
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!stat.isDirectory()) {
    return { ok: false, error: `Error: directory not found — ${trimmed} (not a directory)` };
  }

  const displayPath = path.isAbsolute(trimmed)
    ? trimmed
    : path.relative(root, real).split(path.sep).join('/');

  return { ok: true, resolved: real, displayPath };
}

/**
 * Resolve an image path for `local_read_image`.
 * Absolute paths may point anywhere on the user's machine (Desktop, Downloads, etc.).
 * Relative paths stay scoped to the active project root (same as read_file).
 */
export async function resolveLocalImagePath(inputPath: string): Promise<PathResolveResult> {
  if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
    return { ok: false, error: 'Error: file not found — path is required' };
  }

  const root = workspaceRoot();
  const rootReal = await resolveWorkspaceRootReal();
  const trimmed = inputPath.trim();
  const joined = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(root, trimmed);

  let real: string;
  try {
    real = await fs.realpath(joined);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return { ok: false, error: `Error: file not found — ${trimmed}` };
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return { ok: false, error: `Error: read failed — permission denied for ${trimmed}` };
    }
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!path.isAbsolute(trimmed) && !isDescendantOf(rootReal, real)) {
    return { ok: false, error: outsideWorkspaceError(root) };
  }

  let stat;
  try {
    stat = await fs.stat(real);
  } catch (e: unknown) {
    return { ok: false, error: `Error: read failed — ${e instanceof Error ? e.message : String(e)}` };
  }

  if (!stat.isFile()) {
    return { ok: false, error: `Error: file not found — ${trimmed} (not a file)` };
  }

  const ext = path.extname(real).slice(1).toLowerCase();
  if (!isImageExtension(ext)) {
    return {
      ok: false,
      error: `Error: not an image file — supported extensions: ${formatSupportedImageExtensions()}`,
    };
  }

  const displayPath = path.isAbsolute(trimmed)
    ? trimmed
    : path.relative(root, real).split(path.sep).join('/');

  return { ok: true, resolved: real, displayPath };
}
