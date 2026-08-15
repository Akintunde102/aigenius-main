import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { buildToolClusterSummary, countToolClusterActivity } from './work-activity-summary.utils';

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

describe('countToolClusterActivity', () => {
  it('counts searches and unique files from tool results', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_grep',
        result: '- src/a.ts:12:match\n- src/b.ts:3:match',
      }),
      makeTool({
        tool: 'local_list_directory',
        result: '### Directory listing\n1. **c.ts**\n   - **Path**: src/c.ts',
      }),
    ];

    expect(countToolClusterActivity(events)).toMatchObject({
      searchFiles: 2,
      searches: 1,
      reads: 0,
      directories: 1,
      commands: 0,
      edits: 0,
    });
  });

  it('counts batch read files from reads[] arguments', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_read_file',
        arguments: {
          reads: [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }],
        },
      }),
    ];

    expect(countToolClusterActivity(events)).toMatchObject({
      reads: 3,
      searchFiles: 0,
    });
  });

  it('ignores in-flight tools when building counts', () => {
    const events: ToolEvent[] = [
      makeTool({ tool: 'local_grep', loading: true, result: '- src/a.ts:1:x' }),
      makeTool({ tool: 'local_shell', arguments: { command: 'npm test' } }),
    ];

    expect(countToolClusterActivity(events)).toMatchObject({
      searchFiles: 0,
      searches: 0,
      commands: 1,
    });
  });
});

describe('buildToolClusterSummary', () => {
  it('formats explored files and searches like Cursor', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_grep',
        result: '- src/a.ts:1:x\n- src/b.ts:2:y\n- src/c.ts:3:z\n- src/d.ts:4:z\n- src/e.ts:5:z',
      }),
      makeTool({
        tool: 'local_rag_query',
        result: '1. **chunk**\n   - **Path**: src/f.ts\n   - **Location**: lines 1-4',
      }),
      makeTool({
        tool: 'local_list_symbols',
        result: '- fn **foo** — src/g.ts:10',
      }),
    ];

    expect(buildToolClusterSummary(events)).toBe('Explored 7 files, 3 searches');
  });

  it('formats batch reads with the file count', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_read_file',
        arguments: {
          reads: [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }, { path: 'd.ts' }],
        },
      }),
    ];

    expect(buildToolClusterSummary(events)).toBe('Read 4 files');
  });

  it('describes list directory without explored-file wording', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_list_directory',
        arguments: { path: 'C:/proj/src' },
        result: '### Directory listing\n1. **a.ts**\n   - **Path**: C:/proj/src/a.ts',
      }),
    ];

    expect(buildToolClusterSummary(events)).toBe('Listed src');
  });

  it('describes uncategorized tools with display names', () => {
    const events: ToolEvent[] = [
      makeTool({ tool: 'local_retrieval_memory_upsert', result: '{"ok":true}' }),
    ];

    expect(buildToolClusterSummary(events)).toBe('Retrieval memory save (desktop)');
  });

  it('describes mixed uncategorized tools with activity nouns', () => {
    const events: ToolEvent[] = [
      makeTool({ tool: 'gmail_send', result: '{"success":true}' }),
      makeTool({ tool: 'web_fetch', result: '{"success":true}' }),
    ];

    expect(buildToolClusterSummary(events)).toBe('1 email sent, 1 web fetch');
  });

  it('returns null for an empty cluster', () => {
    expect(buildToolClusterSummary([])).toBeNull();
  });

  it('shows display name for a single in-flight tool', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_grep',
        displayName: 'local_grep',
        loading: true,
        arguments: { pattern: 'foo' },
      }),
    ];

    expect(buildToolClusterSummary(events)).toBe('Grep file contents (desktop)');
  });
});
