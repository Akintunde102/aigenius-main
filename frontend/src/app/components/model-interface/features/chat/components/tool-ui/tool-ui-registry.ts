import type { ComponentType } from 'react';
import type { ToolStreamingCardProps } from '../tool-streaming-card.types';
import { LocalApplyPatchToolCard } from './LocalApplyPatchToolCard';
import { LocalShellToolCard } from './LocalShellToolCard';

const REGISTRY: Record<string, ComponentType<ToolStreamingCardProps>> = {
  local_apply_patch: LocalApplyPatchToolCard,
  local_shell: LocalShellToolCard,
  run_command: LocalShellToolCard,
};

export function resolveToolStreamingUi(tool: string): ComponentType<ToolStreamingCardProps> | null {
  return REGISTRY[tool] ?? null;
}
