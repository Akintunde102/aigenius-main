import path from 'path';
import type { DirectoryListingItem } from './tool-formatter';
import { listDirectoryViaFs } from './list-directory-via-fs';
import type { DirectoryAggregation } from './list-directory-aggregation.utils';

export type ListDirectoryViaShellOptions = {
  limit?: number;
  summaryOnly?: boolean;
  pattern?: string;
  extensions?: string[] | null;
  recursive?: boolean;
};

export type ListDirectoryViaShellResult = {
  items: DirectoryListingItem[];
  shellCommand: string;
  terminalOutput?: string;
  structured: boolean;
  aggregation?: DirectoryAggregation;
  warnings?: string[];
  permissionDenied?: boolean;
};

function clampLimit(limit: number | undefined): number {
  return typeof limit === 'number' ? Math.min(Math.max(1, limit), 1000) : 100;
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/'/g, "''");
}

function escapeShSingleQuoted(value: string): string {
  return value.replace(/'/g, `'\\''`);
}

export function formatListDirectoryShellCommand(dirPath: string): string {
  if (process.platform === 'win32') {
    return `Get-ChildItem -LiteralPath '${escapePowerShellSingleQuoted(dirPath)}' -Force`;
  }
  return `ls -1Ap '${escapeShSingleQuoted(dirPath)}'`;
}

export function parseListDirectoryShellStdout(stdout: string): DirectoryListingItem[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return parseLs1ApOutput(trimmed, '');
  }

  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    const message = typeof (parsed as { error?: unknown }).error === 'string'
      ? (parsed as { error: string }).error
      : 'Directory listing failed';
    throw new Error(message);
  }

  const rows = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const items: DirectoryListingItem[] = [];

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    const itemPath = typeof record.path === 'string' ? record.path : '';
    const isDir = !!record.isDir;
    if (!name || !itemPath) continue;

    const item: DirectoryListingItem = { name, path: itemPath, isDir };
    if (!isDir && typeof record.size === 'number') {
      item.size = record.size;
    }
    if (!isDir && typeof record.mtime === 'number' && record.mtime > 0) {
      item.mtime = record.mtime;
    }
    items.push(item);
  }

  return items;
}

/** True when line-oriented parsing likely misread shell table headers as filenames. */
export function looksLikeMisparsedShellTableOutput(items: DirectoryListingItem[]): boolean {
  if (items.length === 0) return false;

  const garbageNamePatterns = [
    /^Name$/,
    /^-+$/,
    /^Mode\s+LastWriteTime/i,
    /^Directory:\s/i,
    /^----\s+/,
  ];

  return items.some((item) => {
    const name = item.name.trim();
    return garbageNamePatterns.some((pattern) => pattern.test(name));
  });
}

export function parseLs1ApOutput(stdout: string, rootPath: string): DirectoryListingItem[] {
  const items: DirectoryListingItem[] = [];
  for (const rawLine of stdout.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    let name = line;
    let isDir = false;
    if (name.endsWith('/')) {
      isDir = true;
      name = name.slice(0, -1);
    } else if (name.endsWith('@') || name.endsWith('*') || name.endsWith('=') || name.endsWith('|')) {
      name = name.slice(0, -1);
    }

    if (!name || name === '.' || name === '..') continue;
    items.push({
      name,
      path: rootPath ? path.join(rootPath, name) : name,
      isDir,
    });
  }
  return items;
}

/**
 * List a directory via native filesystem APIs. A leftover `command` key on the
 * tool payload is ignored — this never spawns a shell child process.
 */
export async function listDirectoryViaShell(
  dirPath: string,
  options: ListDirectoryViaShellOptions = {},
): Promise<ListDirectoryViaShellResult> {
  const resolved = path.resolve(dirPath);
  const limit = clampLimit(options.limit);
  const listed = await listDirectoryViaFs(resolved, {
    limit,
    summaryOnly: options.summaryOnly,
    pattern: options.pattern,
    extensions: options.extensions,
    recursive: options.recursive,
  });
  return {
    items: listed.items,
    shellCommand: formatListDirectoryShellCommand(resolved),
    structured: true,
    aggregation: listed.aggregation,
    warnings: listed.warnings,
    permissionDenied: listed.permissionDenied,
  };
}
