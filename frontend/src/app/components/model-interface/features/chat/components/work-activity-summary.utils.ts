import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { formatNounCount, getToolActivityNoun } from '@/shared/tool-activity-nouns';
import { buildSearchToolHoverPreview } from './tool-ui/search-tool-hover.utils';
import {
  buildListDirectoryLabel,
  buildReadFilesLabel,
  buildToolActivityLabel,
  countReadFilesInEvent,
  LIST_DIRECTORY_TOOL,
} from './tool-ui/tool-activity-label.utils';
import { getToolDisplayName } from './toolDisplayNames';

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
]);

const READ_TOOL_NAMES = new Set(['local_read_file', 'read_file', 'read_local_file']);
const SHELL_TOOL_NAMES = new Set(['local_shell', 'run_command']);
const PATCH_TOOL_NAMES = new Set(['local_apply_patch']);

export type ToolClusterActivityCounts = {
  searchFiles: number;
  searches: number;
  reads: number;
  directories: number;
  commands: number;
  edits: number;
  otherTools: number;
};

export function countToolClusterActivity(events: ToolEvent[]): ToolClusterActivityCounts {
  const searchFileKeys = new Set<string>();
  let searches = 0;
  let reads = 0;
  let directories = 0;
  let commands = 0;
  let edits = 0;
  let otherTools = 0;

  for (const event of events) {
    if (event.loading) continue;

    if (event.tool === LIST_DIRECTORY_TOOL) {
      directories += 1;
      continue;
    }

    if (SEARCH_TOOL_NAMES.has(event.tool)) {
      searches += 1;
      collectFilesFromEvent(event, searchFileKeys);
      continue;
    }

    if (READ_TOOL_NAMES.has(event.tool)) {
      reads += countReadFilesInEvent(event);
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
            searchFileKeys.add(path.trim());
          }
        }
      }
      continue;
    }

    otherTools += 1;
    collectFilesFromEvent(event, searchFileKeys);
  }

  return {
    searchFiles: searchFileKeys.size,
    searches,
    reads,
    directories,
    commands,
    edits,
    otherTools,
  };
}

export function buildToolClusterSummary(events: ToolEvent[]): string | null {
  if (events.length === 0) return null;

  if (events.length === 1) {
    const single = buildToolActivityLabel(events[0]);
    if (single) return single;

    const richSingle = buildRichSingleToolSummary(events[0]);
    if (richSingle) return richSingle;

    const evt = events[0];
    if (!evt.loading) {
      const displayName = evt.displayName?.trim();
      if (displayName && displayName !== evt.tool) return displayName;
      return getToolDisplayName(evt.tool);
    }
  }

  const counts = countToolClusterActivity(events);
  const parts: string[] = [];

  if (counts.reads > 0) {
    parts.push(buildReadFilesLabel(counts.reads));
  }

  if (counts.searchFiles > 0) {
    parts.push(`Explored ${counts.searchFiles} file${counts.searchFiles === 1 ? '' : 's'}`);
  }

  if (counts.directories > 0) {
    parts.push(
      counts.directories === 1
        ? 'Listed 1 directory'
        : `Listed ${counts.directories} directories`,
    );
  }

  if (counts.searches > 0) {
    parts.push(`${counts.searches} search${counts.searches === 1 ? '' : 'es'}`);
  }

  if (counts.commands > 0) {
    parts.push(`${counts.commands} command${counts.commands === 1 ? '' : 's'}`);
  }

  if (counts.edits > 0) {
    parts.push(`${counts.edits} edit${counts.edits === 1 ? '' : 's'}`);
  }

  if (parts.length === 0 && counts.otherTools > 0) {
    const otherSummary = buildOtherToolsClusterSummary(events);
    if (otherSummary) return otherSummary;
  }

  if (parts.length === 0) {
    const completed = events.filter((e) => !e.loading).length;
    if (completed === 0) return null;
    return `${completed} step${completed === 1 ? '' : 's'}`;
  }

  return parts.join(', ');
}

function isCategorizedTool(tool: string): boolean {
  return (
    tool === LIST_DIRECTORY_TOOL
    || SEARCH_TOOL_NAMES.has(tool)
    || READ_TOOL_NAMES.has(tool)
    || SHELL_TOOL_NAMES.has(tool)
    || PATCH_TOOL_NAMES.has(tool)
  );
}

function buildOtherToolsClusterSummary(events: ToolEvent[]): string | null {
  const otherEvents = events.filter((event) => !event.loading && !isCategorizedTool(event.tool));
  if (otherEvents.length === 0) return null;

  const buckets = new Map<string, { noun: ReturnType<typeof getToolActivityNoun>; count: number }>();
  for (const event of otherEvents) {
    const noun = getToolActivityNoun(event.tool);
    const bucket = buckets.get(event.tool) ?? { noun, count: 0 };
    bucket.count += 1;
    buckets.set(event.tool, bucket);
  }

  const summaryParts: string[] = [];
  for (const bucket of buckets.values()) {
    summaryParts.push(formatNounCount(bucket.count, bucket.noun));
  }

  return summaryParts.length > 0 ? summaryParts.join(', ') : null;
}

function buildRichSingleToolSummary(event: ToolEvent): string | null {
  if (event.loading) return null;

  if (SEARCH_TOOL_NAMES.has(event.tool)) {
    const preview = buildSearchToolHoverPreview(event.tool, event.arguments, event.result);
    const fileCount = preview?.files.length ?? 0;
    if (fileCount > 0) {
      return `Explored ${fileCount} file${fileCount === 1 ? '' : 's'}`;
    }
  }

  if (event.tool === LIST_DIRECTORY_TOOL) {
    return buildListDirectoryLabel(event.arguments);
  }

  return null;
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
