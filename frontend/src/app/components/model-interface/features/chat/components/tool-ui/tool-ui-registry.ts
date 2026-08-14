import type { ComponentType } from 'react';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import { LocalApplyPatchToolCard } from './LocalApplyPatchToolCard';
import { LocalListDirectoryToolCard } from './LocalListDirectoryToolCard';
import { LocalShellToolCard } from './LocalShellToolCard';
import { ToolWebFetchCard } from './ToolWebFetchCard';

const REGISTRY: Record<string, ComponentType<ToolStreamingCardProps>> = {
  local_apply_patch: LocalApplyPatchToolCard,
  local_list_directory: LocalListDirectoryToolCard,
  local_shell: LocalShellToolCard,
  run_command: LocalShellToolCard,
  web_fetch: ToolWebFetchCard,
};

export function resolveToolStreamingUi(tool: string): ComponentType<ToolStreamingCardProps> | null {
  return REGISTRY[tool] ?? null;
}
