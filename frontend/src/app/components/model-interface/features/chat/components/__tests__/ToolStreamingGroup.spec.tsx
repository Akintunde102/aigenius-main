/**
 * @jest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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
  afterEach(() => {
    cleanup();
  });

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

  it('keeps a finished cluster settled while a later cluster is still working', () => {
    const finished: ToolEvent[] = [
      makeTool({
        tool: 'local_list_directory',
        arguments: { path: 'C:/proj/src/components' },
        result: '### Directory listing',
        success: true,
        loading: false,
      }),
    ];
    const running: ToolEvent[] = [
      makeTool({
        tool: 'local_shell',
        displayName: 'Local terminal (desktop)',
        arguments: { command: 'whoami' },
        loading: true,
      }),
    ];

    render(
      <>
        <ToolStreamingGroup events={finished} messageStreaming />
        <ToolStreamingGroup events={running} messageStreaming />
      </>,
    );

    expect(screen.getByRole('button', { name: /Listed components/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Running a command/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Working…/i })).not.toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('does not keep Working… after this cluster finishes just because the turn is still streaming', () => {
    const { rerender } = render(
      <ToolStreamingGroup
        events={[
          makeTool({
            tool: 'local_shell',
            displayName: 'Local terminal (desktop)',
            arguments: { command: 'whoami' },
            loading: true,
          }),
        ]}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /Running a command/i })).toBeInTheDocument();

    rerender(
      <ToolStreamingGroup
        events={[
          makeTool({
            tool: 'local_shell',
            displayName: 'Local terminal (desktop)',
            arguments: { command: 'whoami' },
            result: 'dell5530',
            success: true,
            loading: false,
          }),
        ]}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /Local terminal \(desktop\)/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Working…/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Running a command/i })).not.toBeInTheDocument();
  });

  it('collapses once its own tools finish even if the turn is still streaming', () => {
    const running = makeTool({
      tool: 'local_shell',
      displayName: 'Local terminal (desktop)',
      arguments: { command: 'whoami' },
      loading: true,
    });
    const { rerender } = render(
      <ToolStreamingGroup events={[running]} messageStreaming />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Running a command/i }));
    expect(screen.getAllByRole('button', { name: /Running a command/i })[0]).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    rerender(
      <ToolStreamingGroup
        events={[
          makeTool({
            tool: 'local_shell',
            displayName: 'Local terminal (desktop)',
            arguments: { command: 'whoami' },
            result: 'dell5530',
            success: true,
            loading: false,
          }),
        ]}
        messageStreaming
      />,
    );

    expect(screen.getByRole('button', { name: /Local terminal \(desktop\)/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
