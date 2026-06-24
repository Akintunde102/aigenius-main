import type { ChatMessageDisplayBlock } from '@/app/components/model-interface/features/messages/components/chatMessageDisplay.utils';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import {
  clusterToolDisplayBlocks,
  resolveStreamingToolRowLabel,
} from './cluster-tool-display-blocks';

function makeTool(
  evt: Partial<Omit<ToolEvent, 'type'>> &
    Pick<ToolEvent, 'tool' | 'displayName'> & { type?: 'tool' },
): ToolEvent {
  return {
    type: 'tool',
    ...evt,
    arguments: evt.arguments ?? {},
    logs: evt.logs ?? [],
    loading: evt.loading ?? false,
    timestamp: evt.timestamp ?? 0,
  } as ToolEvent;
}

describe('resolveStreamingToolRowLabel', () => {
  it('prefers activityTitle', () => {
    const t = makeTool({
      tool: 'x',
      displayName: 'ignored',
      arguments: { activityTitle: '  Open folder  ' },
    });
    expect(resolveStreamingToolRowLabel(t)).toBe('Open folder');
  });
});

describe('clusterToolDisplayBlocks', () => {
  it('wraps a single tool row into a tool cluster', () => {
    const a = makeTool({
      tool: 'a',
      displayName: 'One',
      timestamp: 1000,
    });
    const blocks: ChatMessageDisplayBlock[] = [{ type: 'tool', event: a }];
    expect(clusterToolDisplayBlocks(blocks)).toEqual([{ type: 'tool_cluster', events: [a] }]);
  });

  it('merges consecutive tools regardless of labels/timestamps', () => {
    const a = makeTool({
      tool: 'search',
      displayName: 'Searching docs',
      timestamp: 0,
    });
    const b = makeTool({
      tool: 'local_shell',
      displayName: 'Executing command',
      timestamp: 100000,
    });
    const blocks: ChatMessageDisplayBlock[] = [
      { type: 'tool', event: a },
      { type: 'tool', event: b },
    ];
    const got = clusterToolDisplayBlocks(blocks);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ type: 'tool_cluster', events: [a, b] });
  });

  it('does not merge across text segments', () => {
    const a = makeTool({ tool: 'a', displayName: 'Same', timestamp: 0 });
    const b = makeTool({ tool: 'b', displayName: 'Same', timestamp: 0 });
    const blocks: ChatMessageDisplayBlock[] = [
      { type: 'tool', event: a },
      { type: 'text', content: 'hi', endsWithLastTextEvent: true },
      { type: 'tool', event: b },
    ];
    const got = clusterToolDisplayBlocks(blocks);
    expect(got).toHaveLength(3);
    expect(got[0]).toMatchObject({ type: 'tool_cluster', events: [a] });
    expect(got[2]).toMatchObject({ type: 'tool_cluster', events: [b] });
  });
});
