import path from 'path';
import { formatDirectoryListing, formatReadFileBatch } from './utils/tool-formatter';
import { isIgnoredUnderRoot } from './utils/exemptions';
import { parseListDirectoryToolArgs, filePassesExtensionFilter } from './utils/list-directory-args.utils';
import { matchesDirectoryNamePattern } from './utils/match-directory-name-pattern';
import { inferAggregationFromItems, type DirectoryAggregation } from './utils/list-directory-aggregation.utils';
import { listDirectoryViaShell } from './utils/list-directory-via-shell';
import { executeReadFile } from './utils/read-file';
import { registerReadFileBatchForPreview } from './utils/register-preview-paths';
import { resolveDirectoryPath } from './utils/read-file/path-resolver';

type ListingEntry = { path: string; name: string; isDir: boolean; size?: number; mtime?: number };

export async function readBoundedFile(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  try {
    const batch = await executeReadFile(args);
    registerReadFileBatchForPreview(batch.results);
    const firstError = batch.results.find((r) => r.status === 'error');
    if (batch.results.length === 1 && firstError) {
      return { ok: false, error: firstError.error ?? firstError.content };
    }
    const formatted = formatReadFileBatch(batch);
    return { ok: true, result: formatted.result, rawData: formatted.rawData };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'read failed' };
  }
}

export async function listLocalDirectory(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const rawPath = typeof args.path === 'string' ? args.path.trim() : '';
  if (!rawPath) {
    return { ok: false, error: 'path is required' };
  }

  const pathResult = await resolveDirectoryPath(rawPath);
  if (!pathResult.ok) {
    return { ok: false, error: pathResult.error };
  }
  const dirPath = pathResult.resolved;
  const { recursive, pattern, extensions, limit, summaryOnly } = parseListDirectoryToolArgs(args);

  try {
    const collected = await collectDirectoryListing(dirPath, {
      recursive,
      pattern,
      extensions,
      limit,
      summaryOnly,
    });

    const totals = collected.aggregation ?? inferAggregationFromItems(collected.results);
    const formatted = formatDirectoryListing({
      path: dirPath,
      items: collected.results,
      hitLimit: !summaryOnly && (collected.results.length >= limit || totals.totalEntries > collected.results.length),
      summaryOnly,
      aggregation: totals,
      warnings: collected.warnings,
      hadFilters: Boolean(pattern || extensions?.length),
      permissionDenied: collected.permissionDenied,
    });
    return {
      ok: true,
      result: formatted.result,
      rawData: formatted.rawData,
    };
  } catch (e: any) {
    return { ok: false, error: `Failed to list directory: ${e.message}` };
  }
}

async function collectDirectoryListing(
  dirPath: string,
  options: {
    recursive: boolean;
    pattern: string;
    extensions: string[] | null;
    limit: number;
    summaryOnly: boolean;
  },
): Promise<{
  results: ListingEntry[];
  aggregation?: DirectoryAggregation;
  warnings: string[];
  permissionDenied: boolean;
}> {
  const { recursive, pattern, extensions, limit, summaryOnly } = options;
  const listing = await listDirectoryViaShell(dirPath, {
    limit,
    summaryOnly,
    pattern: pattern || undefined,
    extensions,
    recursive,
  });

  const warnings = listing.warnings ? [...listing.warnings] : [];
  const permissionDenied = listing.permissionDenied === true;

  if (summaryOnly) {
    return {
      results: [],
      aggregation: listing.aggregation,
      warnings,
      permissionDenied,
    };
  }

  const results: ListingEntry[] = [];
  for (const entry of listing.items) {
    if (results.length >= limit) break;
    if (isIgnoredUnderRoot(dirPath, entry.path)) {
      continue;
    }

    const baseName = path.basename(entry.path);
    if (!matchesDirectoryNamePattern(baseName, pattern || undefined)) {
      continue;
    }

    if (entry.isDir) {
      results.push({ path: entry.path, name: entry.name, isDir: true });
      continue;
    }

    if (filePassesExtensionFilter(baseName, extensions)) {
      results.push({
        path: entry.path,
        name: entry.name,
        isDir: false,
        size: entry.size,
        mtime: entry.mtime,
      });
    }
  }

  return {
    results,
    aggregation: listing.aggregation,
    warnings,
    permissionDenied,
  };
}
