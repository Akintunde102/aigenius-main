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

const READ_LOOP_MAX_COUNT = 8;
const READ_LOOP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

type ReadHistoryEntry = { count: number; firstAt: number };
const fileReadHistory = new Map<string, ReadHistoryEntry>();

export function resetFileReadHistoryForTests(): void {
  fileReadHistory.clear();
}

function checkAndRecordFileRead(filePath: string): string | null {
  const now = Date.now();
  if (fileReadHistory.size > 200) {
    for (const [key, val] of fileReadHistory.entries()) {
      if (now - val.firstAt > READ_LOOP_WINDOW_MS) {
        fileReadHistory.delete(key);
      }
    }
  }

  const normalized = filePath.trim().toLowerCase();
  const entry = fileReadHistory.get(normalized);
  if (!entry || now - entry.firstAt > READ_LOOP_WINDOW_MS) {
    fileReadHistory.set(normalized, { count: 1, firstAt: now });
    return null;
  }
  entry.count += 1;
  if (entry.count >= READ_LOOP_MAX_COUNT) {
    return (
      `You have read "${filePath}" ${entry.count} times in small chunks. ` +
      `Stop reading in pieces. If you are attempting to publish this file, use \`publish_html\` with \`filePath\` for HTML or \`host_markdown\` with \`filePath\` for .md files (e.g. \`filePath: "${filePath}"\`), ` +
      `or use a shell command to process it.`
    );
  }
  return null;
}

function extractReadPaths(args: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (typeof args.path === 'string' && args.path.trim()) {
    paths.push(args.path.trim());
  }
  if (Array.isArray(args.reads)) {
    for (const item of args.reads) {
      if (item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string') {
        const p = (item as { path: string }).path.trim();
        if (p) paths.push(p);
      }
    }
  }
  return paths;
}

export async function readBoundedFile(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const targetPaths = extractReadPaths(args);
  for (const p of targetPaths) {
    const loopError = checkAndRecordFileRead(p);
    if (loopError) {
      return { ok: false, error: loopError };
    }
  }

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
