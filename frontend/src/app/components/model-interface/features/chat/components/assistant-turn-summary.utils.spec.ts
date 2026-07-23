import type { ThinkingEvent, ToolEvent } from '@/app/components/model-interface/shared/types';
import type { ChatMessageRenderBlock } from './cluster-tool-display-blocks';
import {
  buildAssistantRenderSegments,
  buildAssistantTurnSummary,
  buildSingleToolTimelineLabel,
  extractWorkTimelineItems,
} from './assistant-turn-summary.utils';

function makeTool(partial: Partial<ToolEvent> & Pick<ToolEvent, 'tool'>): ToolEvent {
  return {
    type: 'tool',
    displayName: partial.displayName ?? partial.tool,
    arguments: partial.arguments ?? {},
    logs: partial.logs ?? [],
    loading: partial.loading ?? false,
    timestamp: partial.timestamp ?? 0,
    result: partial.result,
    success: partial.success,
    ...partial,
  };
}

function makeThinking(content: string): ThinkingEvent {
  return {
    type: 'thinking',
    content,
    loading: false,
    timestamp: Date.now(),
  };
}

describe('extractWorkTimelineItems', () => {
  it('flattens tool clusters into individual tool rows', () => {
    const blocks: ChatMessageRenderBlock[] = [
      { type: 'thinking', event: makeThinking('Plan') },
      {
        type: 'tool_cluster',
        events: [
          makeTool({ tool: 'local_read_file', timestamp: 1 }),
          makeTool({ tool: 'local_grep', timestamp: 2 }),
        ],
      },
    ];

    expect(extractWorkTimelineItems(blocks)).toHaveLength(3);
  });
});

describe('buildAssistantTurnSummary', () => {
  it('aggregates reasoning steps and per-tool noun counts', () => {
    const items = extractWorkTimelineItems([
      { type: 'thinking', event: makeThinking('a') },
      { type: 'thinking', event: makeThinking('b') },
      { type: 'tool', event: makeTool({ tool: 'local_read_file' }) },
      { type: 'tool', event: makeTool({ tool: 'local_read_file' }) },
      { type: 'tool', event: makeTool({ tool: 'local_grep' }) },
      { type: 'tool', event: makeTool({ tool: 'local_grep', success: false }) },
    ]);

    expect(buildAssistantTurnSummary(items)).toBe(
      '2 reasoning steps, 2 reads, 1 search, 1 failed search',
    );
  });
});

describe('buildAssistantRenderSegments', () => {
  it('keeps live blocks while streaming', () => {
    const blocks: ChatMessageRenderBlock[] = [
      { type: 'thinking', event: makeThinking('a') },
      { type: 'text', content: 'answer', endsWithLastTextEvent: true },
    ];

    const segments = buildAssistantRenderSegments(blocks, true);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ type: 'block' });
  });

  it('replaces all work blocks with one summary segment when done', () => {
    const blocks: ChatMessageRenderBlock[] = [
      { type: 'thinking', event: makeThinking('a') },
      { type: 'tool', event: makeTool({ tool: 'local_read_file' }) },
      { type: 'text', content: 'answer', endsWithLastTextEvent: true },
    ];

    const segments = buildAssistantRenderSegments(blocks, false);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({ type: 'work_summary' });
    expect(segments[1]).toMatchObject({ type: 'block', block: { type: 'text' } });
  });
});

describe('buildSingleToolTimelineLabel', () => {
  it('uses rich summaries when available', () => {
    const label = buildSingleToolTimelineLabel(
      makeTool({
        tool: 'local_grep',
        result: '- src/a.ts:1:match\n- src/b.ts:2:match',
      }),
    );

    expect(label).toContain('Explored');
  });
});
