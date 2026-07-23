import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { buildSearchToolHoverPreview } from './tool-ui/search-tool-hover.utils';

const SEARCH_TOOL_NAMES = new Set([
  'local_grep',
  'local_rag_query',
  'local_list_symbols',
  'local_find_references',
  'local_find_callers',
  'local_go_to_definition',
  'local_symbol_outline',
  'local_symbol_blast_radius',
  'local_import_blast_radius',
  'local_get_context',
  'local_list_directory',
]);

const READ_TOOL_NAMES = new Set(['local_read_file', 'read_file', 'read_local_file']);
const SHELL_TOOL_NAMES = new Set(['local_shell', 'run_command']);
const PATCH_TOOL_NAMES = new Set(['local_apply_patch']);

export type ToolClusterActivityCounts = {
  uniqueFiles: number;
  searches: number;
  reads: number;
  commands: number;
  edits: number;
  otherTools: number;
};

export function countToolClusterActivity(events: ToolEvent[]): ToolClusterActivityCounts {
  const fileKeys = new Set<string>();
  let searches = 0;
  let reads = 0;
  let commands = 0;
  let edits = 0;
  let otherTools = 0;

  for (const event of events) {
    if (event.loading) continue;

    if (SEARCH_TOOL_NAMES.has(event.tool)) {
      searches += 1;
      collectFilesFromEvent(event, fileKeys);
      continue;
    }

    if (READ_TOOL_NAMES.has(event.tool)) {
      reads += 1;
      collectFilesFromEvent(event, fileKeys);
      continue;
    }

    if (SHELL_TOOL_NAMES.has(event.tool)) {
      commands += 1;
      continue;
    }

    if (PATCH_TOOL_NAMES.has(event.tool)) {
      edits += 1;
      const ops = event.arguments?.operations;
      if (Array.isArray(ops)) {
        for (const op of ops) {
          if (!op || typeof op !== 'object') continue;
          const path = (op as { path?: unknown }).path;
          if (typeof path === 'string' && path.trim()) {
            fileKeys.add(path.trim());
          }
        }
      }
      continue;
    }

    otherTools += 1;
    collectFilesFromEvent(event, fileKeys);
  }

  return {
    uniqueFiles: fileKeys.size,
    searches,
    reads,
    commands,
    edits,
    otherTools,
  };
}

export function buildToolClusterSummary(events: ToolEvent[]): string | null {
  if (events.length === 0) return null;

  const counts = countToolClusterActivity(events);
  const parts: string[] = [];

  if (counts.uniqueFiles > 0) {
    parts.push(`Explored ${counts.uniqueFiles} file${counts.uniqueFiles === 1 ? '' : 's'}`);
  }

  if (counts.searches > 0) {
    parts.push(`${counts.searches} search${counts.searches === 1 ? '' : 'es'}`);
  }

  if (counts.reads > 0 && counts.uniqueFiles === 0) {
    parts.push(`read ${counts.reads} file${counts.reads === 1 ? '' : 's'}`);
  }

  if (counts.commands > 0) {
    parts.push(`${counts.commands} command${counts.commands === 1 ? '' : 's'}`);
  }

  if (counts.edits > 0) {
    parts.push(`${counts.edits} edit${counts.edits === 1 ? '' : 's'}`);
  }

  if (parts.length === 0 && counts.otherTools > 0) {
    return `${counts.otherTools} tool${counts.otherTools === 1 ? '' : 's'}`;
  }

  if (parts.length === 0) {
    const completed = events.filter((e) => !e.loading).length;
    if (completed === 0) return null;
    return `${completed} step${completed === 1 ? '' : 's'}`;
  }

  return parts.join(', ');
}

function collectFilesFromEvent(event: ToolEvent, fileKeys: Set<string>): void {
  const preview = buildSearchToolHoverPreview(event.tool, event.arguments, event.result);
  if (!preview) return;
  for (const file of preview.files) {
    if (file.path.trim()) {
      fileKeys.add(file.path.trim());
    }
  }
}
