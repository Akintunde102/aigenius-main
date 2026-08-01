/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

jest.mock('../WorkflowIntentTranscriptExpand', () => ({
  WorkflowIntentTranscriptExpand: () => null,
}));

import type { ToolEvent } from '@/app/components/model-interface/shared/types';
import { ToolStreamingGroup } from '../ToolStreamingGroup';

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

describe('ToolStreamingGroup', () => {
  it('renders one label for a single compact tool (no duplicate group header)', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_list_directory',
        arguments: { path: 'C:/proj/src/components' },
        result: '### Directory listing',
        success: true,
      }),
    ];

    render(<ToolStreamingGroup events={events} messageStreaming={false} />);

    expect(screen.getByRole('button', { name: /Listed components/i })).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /Listed components/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Worked/i })).not.toBeInTheDocument();
  });

  it('uses aggregate header for multiple compact tools', () => {
    const events: ToolEvent[] = [
      makeTool({
        tool: 'local_read_file',
        arguments: { reads: [{ path: 'a.ts' }, { path: 'b.ts' }, { path: 'c.ts' }] },
        success: true,
      }),
      makeTool({
        tool: 'local_list_directory',
        arguments: { path: 'C:/proj/lib' },
        success: true,
      }),
    ];

    render(<ToolStreamingGroup events={events} messageStreaming={false} />);

    expect(screen.getByRole('button', { name: /Read 3 files/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Worked/i })).not.toBeInTheDocument();
  });
});
