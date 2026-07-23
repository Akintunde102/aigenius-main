import path from 'path';
import type { DirectoryListingItem } from './tool-formatter';
import { listDirectoryViaFs } from './list-directory-via-fs';
import { assertReadonlyShellCommand, resolveReadonlyShellPlatform } from './readonly-shell-command';
import { resolveWindowsExecutable } from './resolve-windows-executable';
import { runReadonlyShell } from './run-readonly-shell';

export type ListDirectoryViaShellOptions = {
  limit?: number;
  command?: string;
};

export type ListDirectoryViaShellResult = {
  items: DirectoryListingItem[];
  shellCommand: string;
  terminalOutput?: string;
  structured: boolean;
  /** Set when a custom command produced table output that was rejected as unparsable. */
  parseRejected?: boolean;
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

export function formatListDirectoryShellCommand(dirPath: string, command?: string): string {
  if (command?.trim()) {
    return command.trim();
  }
  if (process.platform === 'win32') {
    return `Get-ChildItem -LiteralPath '${escapePowerShellSingleQuoted(dirPath)}' -Force`;
  }
  return `ls -1Ap '${escapeShSingleQuoted(dirPath)}'`;
}

function buildShellInvocation(
  dirPath: string,
  command: string,
): { shell: string; shellArgs: string[] } {
  const shellPlatform = resolveReadonlyShellPlatform();
  assertReadonlyShellCommand(command, shellPlatform);

  if (shellPlatform === 'win32') {
    return {
      shell: resolveWindowsExecutable('powershell.exe'),
      shellArgs: ['-NoProfile', '-NonInteractive', '-Command', command],
    };
  }

  return {
    shell: '/bin/sh',
    shellArgs: ['-c', command],
  };
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

function finalizeParsedItems(items: DirectoryListingItem[], rootPath: string, limit: number): DirectoryListingItem[] {
  const normalized = items.map((item) => ({
    ...item,
    path: item.path || path.join(rootPath, item.name),
  }));
  return normalized.slice(0, limit);
}

/**
 * List a directory via read-only shell. When `command` is omitted, uses structured defaults for the file explorer UI.
 */
export async function listDirectoryViaShell(
  dirPath: string,
  options: ListDirectoryViaShellOptions = {},
): Promise<ListDirectoryViaShellResult> {
  const resolved = path.resolve(dirPath);
  const limit = clampLimit(options.limit);
  const customCommand = typeof options.command === 'string' ? options.command.trim() : '';

  if (!customCommand) {
    const items = finalizeParsedItems(await listDirectoryViaFs(resolved, limit), resolved, limit);
    return {
      items,
      shellCommand: formatListDirectoryShellCommand(resolved),
      structured: items.length > 0,
    };
  }

  const invocation = {
    ...buildShellInvocation(resolved, customCommand),
    shellCommand: customCommand,
  };

  const result = await runReadonlyShell({
    shell: invocation.shell,
    shellArgs: invocation.shellArgs,
    cwd: resolved,
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  const stdout = result.stdout.trim();
  let items = parseListDirectoryShellStdout(stdout);
  if (items.length > 0 && items.every((item) => !path.isAbsolute(item.path))) {
    items = parseLs1ApOutput(stdout, resolved);
  }

  let parseRejected = false;
  if (customCommand && items.length > 0 && looksLikeMisparsedShellTableOutput(items)) {
    parseRejected = true;
    items = [];
  }

  items = finalizeParsedItems(items, resolved, limit);
  const structured = items.length > 0;

  return {
    items,
    shellCommand: invocation.shellCommand,
    terminalOutput: structured ? undefined : stdout,
    structured,
    parseRejected,
  };
}
