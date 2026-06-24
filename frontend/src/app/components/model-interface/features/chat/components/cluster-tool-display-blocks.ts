import type { ChatMessageDisplayBlock } from '@/app/components/model-interface/features/messages/components/chatMessageDisplay.utils';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { getToolDisplayName } from './toolDisplayNames';

export type ChatMessageRenderBlock =
  | ChatMessageDisplayBlock
  | { type: 'tool_cluster'; events: ToolEvent[] };

export function resolveStreamingToolRowLabel(event: Pick<ToolEvent, 'tool' | 'displayName' | 'arguments'>): string {
  const args = event.arguments;
  const activityTitle = typeof args?.activityTitle === 'string' ? args.activityTitle.trim() : '';
  if (activityTitle) return activityTitle;
  const dn = event.displayName?.trim();
  if (dn) return dn;
  return getToolDisplayName(event.tool);
}

/**
 * Groups contiguous tool blocks into one cluster.
 * Text segments remain hard separators, preserving text → tools → text flow.
 */
export function clusterToolDisplayBlocks(blocks: ChatMessageDisplayBlock[]): ChatMessageRenderBlock[] {
  const out: ChatMessageRenderBlock[] = [];
  let i = 0;

  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type !== 'tool') {
      out.push(b);
      i += 1;
      continue;
    }

    const cluster: ToolEvent[] = [b.event];
    let j = i + 1;
    while (j < blocks.length && blocks[j].type === 'tool') {
      const cur = (blocks[j] as { type: 'tool'; event: ToolEvent }).event;
      cluster.push(cur);
      j += 1;
    }

    out.push({ type: 'tool_cluster', events: cluster });
    i = j;
  }

  return out;
}
