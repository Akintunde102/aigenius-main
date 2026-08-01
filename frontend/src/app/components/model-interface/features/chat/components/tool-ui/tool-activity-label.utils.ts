import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { buildSearchToolHoverPreview } from './search-tool-hover.utils';

export const READ_FILE_TOOL_NAMES = new Set(['local_read_file', 'read_file', 'read_local_file']);
export const LIST_DIRECTORY_TOOL = 'local_list_directory';

export function isReadFileTool(tool: string): boolean {
  return READ_FILE_TOOL_NAMES.has(tool);
}

export function extractReadFilePathsFromArgs(args: Record<string, unknown> | undefined): string[] {
  if (!args) return [];

  const paths: string[] = [];
  const reads = args.reads;
  if (Array.isArray(reads)) {
    for (const item of reads) {
      if (!item || typeof item !== 'object') continue;
      const path = (item as { path?: unknown }).path;
      if (typeof path === 'string' && path.trim()) {
        paths.push(path.trim());
      }
    }
  }

  const singlePath = args.path;
  if (typeof singlePath === 'string' && singlePath.trim()) {
    paths.push(singlePath.trim());
  }

  return paths;
}

export function countReadFilesInArgs(args: Record<string, unknown> | undefined): number {
  return extractReadFilePathsFromArgs(args).length;
}

export function buildReadFilesLabel(count: number): string {
  const safeCount = Math.max(1, count);
  return `Read ${safeCount} file${safeCount === 1 ? '' : 's'}`;
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

export function buildToolActivityLabel(
  event: Pick<ToolEvent, 'tool' | 'arguments' | 'result' | 'loading'>,
): string | null {
  if (event.loading) return 'Working…';

  if (event.tool === LIST_DIRECTORY_TOOL) {
    return buildListDirectoryLabel(event.arguments);
  }

  if (isReadFileTool(event.tool)) {
    return buildReadFilesLabel(countReadFilesInEvent(event));
  }

  return null;
}
