import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { buildSearchToolHoverPreview } from './search-tool-hover.utils';

export const READ_FILE_TOOL_NAMES = new Set(['local_read_file', 'read_file', 'read_local_file']);
export const LIST_DIRECTORY_TOOL = 'local_list_directory';

export function isReadFileTool(tool: string): boolean {
  return READ_FILE_TOOL_NAMES.has(tool);
}

/** Extract basename from a file path, normalising Windows + POSIX separators. */
export function fileBasename(filePath: string): string {
  return filePath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? filePath;
}

/**
 * Truncate a filename if it exceeds `maxLen` chars.
 * Keeps the extension visible: `very-long-name.tsx` → `very-long-…tsx`.
 */
export function truncateFilename(name: string, maxLen = 22): string {
  if (name.length <= maxLen) return name;
  const dotIdx = name.lastIndexOf('.');
  const ext = dotIdx > 0 ? name.slice(dotIdx) : '';
  const keep = maxLen - ext.length - 1; // 1 for the ellipsis
  return `${name.slice(0, Math.max(keep, 4))}…${ext}`;
}

export type ReadFileEntry = {
  path: string;
  startLine?: number;
  endLine?: number;
};

export function extractReadFileEntriesFromArgs(
  args: Record<string, unknown> | undefined,
): ReadFileEntry[] {
  if (!args) return [];

  const entries: ReadFileEntry[] = [];
  const reads = args.reads;
  if (Array.isArray(reads)) {
    for (const item of reads) {
      if (!item || typeof item !== 'object') continue;
      const r = item as Record<string, unknown>;
      const path = typeof r.path === 'string' ? r.path.trim() : '';
      if (!path) continue;
      entries.push({
        path,
        startLine: typeof r.start_line === 'number' ? r.start_line : undefined,
        endLine: typeof r.end_line === 'number' ? r.end_line : undefined,
      });
    }
  }

  const singlePath = args.path;
  if (typeof singlePath === 'string' && singlePath.trim()) {
    entries.push({
      path: singlePath.trim(),
      startLine: typeof args.start_line === 'number' ? args.start_line : undefined,
      endLine: typeof args.end_line === 'number' ? args.end_line : undefined,
    });
  }

  return entries;
}

export function extractReadFilePathsFromArgs(args: Record<string, unknown> | undefined): string[] {
  return extractReadFileEntriesFromArgs(args).map((e) => e.path);
}

export function countReadFilesInArgs(args: Record<string, unknown> | undefined): number {
  return extractReadFileEntriesFromArgs(args).length;
}

/** Format a single read entry as `basename.ts` or `basename.ts:10–40`. */
function formatReadEntry(entry: ReadFileEntry, maxLen = 22): string {
  const name = truncateFilename(fileBasename(entry.path), maxLen);
  if (entry.startLine !== undefined && entry.endLine !== undefined) {
    return `${name}:${entry.startLine}–${entry.endLine}`;
  }
  if (entry.startLine !== undefined) {
    return `${name}:${entry.startLine}`;
  }
  return name;
}

/**
 * Build a human-readable read label:
 * - 1 file  → "Read index.html:120–150"
 * - 2 files → "Read a.ts, b.ts"
 * - 3+ files → "Read a.ts, b.ts +N more"
 */
export function buildReadFilesLabel(
  count: number,
  entries?: ReadFileEntry[],
): string {
  const safeCount = Math.max(1, count);

  if (!entries || entries.length === 0) {
    return `Read ${safeCount} file${safeCount === 1 ? '' : 's'}`;
  }

  const MAX_INLINE = 2;
  const shown = entries.slice(0, MAX_INLINE).map((e) => formatReadEntry(e));
  const extra = entries.length - MAX_INLINE;

  if (entries.length === 1) {
    return `Read ${shown[0]}`;
  }

  const base = `Read ${shown.join(', ')}`;
  return extra > 0 ? `${base} +${extra} more` : base;
}

export function buildListDirectoryLabel(args: Record<string, unknown> | undefined): string {
  const rawPath = typeof args?.path === 'string' ? args.path.trim() : '';
  if (!rawPath) return 'Listed directory';

  const name = rawPath.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? rawPath;
  return `Listed ${name}`;
}

export function countReadFilesInEvent(
  event: Pick<ToolEvent, 'tool' | 'arguments' | 'result'>,
): number {
  if (!isReadFileTool(event.tool)) return 0;

  const fromArgs = countReadFilesInArgs(event.arguments);
  if (fromArgs > 0) return fromArgs;

  const preview = buildSearchToolHoverPreview(event.tool, event.arguments, event.result);
  if (preview && preview.files.length > 0) return preview.files.length;

  return 1;
}

/** Returns entries from args (preferred) or falls back to count=1. */
function resolveReadFileEntries(
  event: Pick<ToolEvent, 'tool' | 'arguments' | 'result'>,
): ReadFileEntry[] | undefined {
  const fromArgs = extractReadFileEntriesFromArgs(event.arguments);
  if (fromArgs.length > 0) return fromArgs;

  // Fallback: try to pull file list from the result preview (no line info)
  const preview = buildSearchToolHoverPreview(event.tool, event.arguments, event.result);
  if (preview && preview.files.length > 0) {
    return preview.files.map((f) => ({ path: f.path }));
  }

  return undefined;
}

export function buildToolActivityLabel(
  event: Pick<ToolEvent, 'tool' | 'arguments' | 'result' | 'loading'>,
): string | null {
  if (event.tool === LIST_DIRECTORY_TOOL) {
    return buildListDirectoryLabel(event.arguments);
  }

  if (isReadFileTool(event.tool)) {
    const entries = resolveReadFileEntries(event);
    const count = entries ? entries.length : countReadFilesInEvent(event);
    return buildReadFilesLabel(count, entries);
  }

  return null;
}
