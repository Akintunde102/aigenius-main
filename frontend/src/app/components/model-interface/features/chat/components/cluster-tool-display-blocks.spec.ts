import type { ChatMessageDisplayBlock } from '@/app/components/model-interface/features/messages/components/chatMessageDisplay.utils';
import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import {
  buildInProgressClusterHeader,
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

  it('shows read label while a read tool is still loading', () => {
    const t = makeTool({
      tool: 'local_read_file',
      displayName: 'local_read_file',
      loading: true,
      arguments: {
        reads: [{ path: 'a.ts' }, { path: 'b.ts' }],
      },
    });
    expect(resolveStreamingToolRowLabel(t)).toBe('Read a.ts, b.ts');
  });

  it('shows shell summary while a shell tool is still loading', () => {
    const t = makeTool({
      tool: 'local_shell',
      displayName: 'local_shell',
      loading: true,
      arguments: { command: 'npm install' },
    });
    expect(resolveStreamingToolRowLabel(t)).toBe('Installing dependencies');
  });

  it('shows tool display name while an uncategorized tool is still loading', () => {
    const t = makeTool({
      tool: 'local_grep',
      displayName: 'local_grep',
      loading: true,
      arguments: { pattern: 'foo' },
    });
    expect(resolveStreamingToolRowLabel(t)).toBe('Grep file contents (desktop)');
  });
});

describe('buildInProgressClusterHeader', () => {
  it('shows the active tool label while one tool is loading', () => {
    const events = [
      makeTool({
        tool: 'local_shell',
        displayName: 'local_shell',
        loading: true,
        arguments: { command: 'git status' },
      }),
    ];

    expect(buildInProgressClusterHeader(events)).toBe('Working with your Git repository');
  });

  it('returns null when nothing is actively running', () => {
    const events = [makeTool({ tool: 'local_grep', displayName: 'local_grep', result: '- src/a.ts:1:x' })];

    expect(buildInProgressClusterHeader(events)).toBeNull();
  });
});

describe('clusterToolDisplayBlocks', () => {
  it('does not create a group when the tool activity is just one', () => {
    const a = makeTool({
      tool: 'a',
      displayName: 'One',
      timestamp: 1000,
    });
    const blocks: ChatMessageDisplayBlock[] = [{ type: 'tool', event: a }];
    expect(clusterToolDisplayBlocks(blocks)).toEqual([{ type: 'tool', event: a }]);
  });

  it('merges consecutive tools into a cluster when there are 2 or more', () => {
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

  it('does not merge across text segments and leaves single tools ungrouped', () => {
    const a = makeTool({ tool: 'a', displayName: 'Same', timestamp: 0 });
    const b = makeTool({ tool: 'b', displayName: 'Same', timestamp: 0 });
    const blocks: ChatMessageDisplayBlock[] = [
      { type: 'tool', event: a },
      { type: 'text', content: 'hi', endsWithLastTextEvent: true },
      { type: 'tool', event: b },
    ];
    const got = clusterToolDisplayBlocks(blocks);
    expect(got).toHaveLength(3);
    expect(got[0]).toMatchObject({ type: 'tool', event: a });
    expect(got[2]).toMatchObject({ type: 'tool', event: b });
  });

  it('clusters consecutive tools while preserving single tools around text segments', () => {
    const a = makeTool({ tool: 'a', displayName: 'A', timestamp: 0 });
    const b = makeTool({ tool: 'b', displayName: 'B', timestamp: 0 });
    const c = makeTool({ tool: 'c', displayName: 'C', timestamp: 0 });
    const blocks: ChatMessageDisplayBlock[] = [
      { type: 'tool', event: a },
      { type: 'tool', event: b },
      { type: 'text', content: 'interlude', endsWithLastTextEvent: false },
      { type: 'tool', event: c },
    ];
    const got = clusterToolDisplayBlocks(blocks);
    expect(got).toHaveLength(3);
    expect(got[0]).toMatchObject({ type: 'tool_cluster', events: [a, b] });
    expect(got[1]).toMatchObject({ type: 'text', content: 'interlude' });
    expect(got[2]).toMatchObject({ type: 'tool', event: c });
  });
});
