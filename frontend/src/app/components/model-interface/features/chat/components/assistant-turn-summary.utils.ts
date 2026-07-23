import type { ThinkingEvent, ToolEvent } from '@/app/components/model-interface/shared/types';
import type { ChatMessageRenderBlock } from './cluster-tool-display-blocks';
import { formatNounCount, getToolActivityNoun } from '@/shared/tool-activity-nouns';
import { buildToolClusterSummary } from './work-activity-summary.utils';

export type WorkTimelineItem =
  | { kind: 'thinking'; event: ThinkingEvent }
  | { kind: 'tool'; event: ToolEvent };

export type AssistantRenderSegment =
  | { type: 'block'; block: ChatMessageRenderBlock }
  | { type: 'work_summary'; items: WorkTimelineItem[] };

export function isWorkRenderBlock(block: ChatMessageRenderBlock): boolean {
  return block.type === 'thinking' || block.type === 'tool' || block.type === 'tool_cluster';
}

export function extractWorkTimelineItems(blocks: ChatMessageRenderBlock[]): WorkTimelineItem[] {
  const items: WorkTimelineItem[] = [];

  for (const block of blocks) {
    if (block.type === 'thinking') {
      if (block.event.content.trim()) {
        items.push({ kind: 'thinking', event: block.event });
      }
      continue;
    }

    if (block.type === 'tool_cluster') {
      for (const event of block.events) {
        items.push({ kind: 'tool', event });
      }
      continue;
    }

    if (block.type === 'tool') {
      items.push({ kind: 'tool', event: block.event });
    }
  }

  return items;
}

export function buildAssistantRenderSegments(
  blocks: ChatMessageRenderBlock[],
  streaming: boolean,
): AssistantRenderSegment[] {
  if (streaming) {
    return blocks.map((block) => ({ type: 'block', block }));
  }

  const workItems = extractWorkTimelineItems(blocks);
  if (workItems.length === 0) {
    return blocks.map((block) => ({ type: 'block', block }));
  }

  const segments: AssistantRenderSegment[] = [];
  let summaryInserted = false;

  for (const block of blocks) {
    if (isWorkRenderBlock(block)) {
      if (!summaryInserted) {
        segments.push({ type: 'work_summary', items: workItems });
        summaryInserted = true;
      }
      continue;
    }
    segments.push({ type: 'block', block });
  }

  return segments;
}

type ToolNounBucket = {
  nounKey: string;
  noun: ReturnType<typeof getToolActivityNoun>;
  success: number;
  failed: number;
};

export function buildAssistantTurnSummary(items: WorkTimelineItem[]): string | null {
  if (items.length === 0) return null;

  const parts: string[] = [];
  const thinkingCount = items.filter((item) => item.kind === 'thinking').length;
  if (thinkingCount > 0) {
    parts.push(`${thinkingCount} reasoning step${thinkingCount === 1 ? '' : 's'}`);
  }

  const buckets = new Map<string, ToolNounBucket>();

  for (const item of items) {
    if (item.kind !== 'tool' || item.event.loading) continue;

    const noun = getToolActivityNoun(item.event.tool);
    const nounKey = item.event.tool;
    const bucket = buckets.get(nounKey) ?? { nounKey, noun, success: 0, failed: 0 };

    if (item.event.success === false) {
      bucket.failed += 1;
    } else {
      bucket.success += 1;
    }

    buckets.set(nounKey, bucket);
  }

  for (const bucket of buckets.values()) {
    if (bucket.success > 0) {
      parts.push(formatNounCount(bucket.success, bucket.noun));
    }
    if (bucket.failed > 0) {
      parts.push(formatNounCount(bucket.failed, bucket.noun, true));
    }
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

export function buildSingleToolTimelineLabel(event: ToolEvent): string {
  if (event.loading) return 'Working…';

  const rich = buildToolClusterSummary([event]);
  if (rich) return rich;

  const noun = getToolActivityNoun(event.tool);
  if (event.success === false) {
    return `Failed ${noun.singular}`;
  }

  return `1 ${noun.singular}`;
}
