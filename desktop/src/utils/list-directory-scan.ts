import fs from 'fs/promises';
import path from 'path';
import type { Dirent } from 'fs';
import type { DirectoryListingItem } from './tool-formatter';
import { isIgnoredUnderRoot } from './exemptions';
import {
  LIST_DIRECTORY_DEFAULT_LIMIT,
  filePassesExtensionFilter,
} from './list-directory-args.utils';
import {
  compileDirectoryNamePattern,
  matchesCompiledDirectoryNamePattern,
} from './match-directory-name-pattern';
import {
  LIST_DIRECTORY_AGGREGATION_SCAN_MAX,
  emptyDirectoryAggregation,
  incrementExtensionCount,
  type DirectoryAggregation,
} from './list-directory-aggregation.utils';

export type ListDirectoryScanOptions = {
  limit?: number;
  summaryOnly?: boolean;
  pattern?: string;
  extensions?: string[] | null;
  recursive?: boolean;
  /** Test override for the 50k safety cap. */
  scanMax?: number;
};

export type ListDirectoryScanResult = {
  items: DirectoryListingItem[];
  aggregation: DirectoryAggregation;
  warnings: string[];
  permissionDenied: boolean;
};

function isPermissionError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === 'EACCES' || code === 'EPERM';
}

function direntIsDirectory(entry: Dirent): boolean {
  return entry.isDirectory() && !entry.isSymbolicLink();
}

async function resolveRealPath(target: string): Promise<string> {
  try {
    return await fs.realpath(target);
  } catch {
    return target;
  }
}

/**
 * Stream a directory tree with `fs.opendir`, apply name/extension filters, and
 * accumulate totals. Recursion walks every folder, even when the folder
 * name itself does not match `pattern`. Counts are exact unless the scan cap
 * is hit (`aggregation.scanCapped`).
 */
export async function scanDirectoryListing(
  dirPath: string,
  options: ListDirectoryScanOptions = {},
): Promise<ListDirectoryScanResult> {
  const limit = typeof options.limit === 'number' ? options.limit : LIST_DIRECTORY_DEFAULT_LIMIT;
  const summaryOnly = !!options.summaryOnly;
  const recursive = !!options.recursive;
  const scanMax =
    typeof options.scanMax === 'number' && options.scanMax > 0
      ? options.scanMax
      : LIST_DIRECTORY_AGGREGATION_SCAN_MAX;
  const compiledPattern = compileDirectoryNamePattern(options.pattern);
  const extensions = options.extensions ?? null;
  const rootPath = path.resolve(dirPath);

  const warnings: string[] = [];
  const aggregation = emptyDirectoryAggregation();
  const matched: Array<{ name: string; path: string; isDir: boolean }> = [];
  const visited = new Set<string>();
  const queue: string[] = [rootPath];
  let queueHead = 0;
  let scanned = 0;
  let permissionDenied = false;

  while (queueHead < queue.length && !aggregation.scanCapped) {
    const currentPath = queue[queueHead++];
    const real = await resolveRealPath(currentPath);
    if (visited.has(real)) continue;
    visited.add(real);

    let dir: Awaited<ReturnType<typeof fs.opendir>>;
    try {
      dir = await fs.opendir(currentPath);
    } catch (error: unknown) {
      if (isPermissionError(error)) {
        warnings.push(`Permission denied reading ${currentPath}`);
        if (currentPath === rootPath) {
          permissionDenied = true;
        }
        continue;
      }
      throw error;
    }

    try {
      for await (const entry of dir) {
        if (scanned >= scanMax) {
          aggregation.scanCapped = true;
          break;
        }

        const name = entry.name;
        if (!name || name === '.' || name === '..') {
          continue;
        }

        const itemPath = path.join(currentPath, name);
        if (isIgnoredUnderRoot(rootPath, itemPath)) {
          continue;
        }

        scanned += 1;
        aggregation.unfilteredTotal += 1;

        const isDir = direntIsDirectory(entry);
        const nameMatches = matchesCompiledDirectoryNamePattern(name, compiledPattern);
        const passesExt = isDir || filePassesExtensionFilter(name, extensions);

        if (nameMatches && passesExt) {
          aggregation.totalEntries += 1;
          if (isDir) {
            aggregation.totalDirs += 1;
          } else {
            aggregation.totalFiles += 1;
            incrementExtensionCount(aggregation.extensionCounts, name);
          }
          if (!summaryOnly && matched.length < limit) {
            matched.push({
              name: path.relative(rootPath, itemPath) || name,
              path: itemPath,
              isDir,
            });
          }
        }

        if (recursive && isDir && !aggregation.scanCapped) {
          queue.push(itemPath);
        }
      }
    } finally {
      await dir.close().catch(() => undefined);
    }
  }

  const items: DirectoryListingItem[] = [];
  if (!summaryOnly) {
    for (const entry of matched) {
      const item: DirectoryListingItem = {
        name: entry.name,
        path: entry.path,
        isDir: entry.isDir,
      };
      if (!entry.isDir) {
        try {
          const stat = await fs.stat(entry.path);
          item.size = stat.size;
          item.mtime = Math.floor(stat.mtimeMs / 1000);
        } catch {
          /* dangling symlink, permission, or transient file */
        }
      }
      items.push(item);
    }
  }

  return { items, aggregation, warnings, permissionDenied };
}
