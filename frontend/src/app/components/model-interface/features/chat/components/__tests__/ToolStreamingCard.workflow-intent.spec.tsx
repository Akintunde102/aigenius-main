/**
 * @jest-environment jsdom
 *
 * ToolStreamingCard pulls lucide-react (ESM); Jest must not parse that graph here.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get: () => () => null,
    },
  );
});

import { ToolStreamingCard } from '../ToolStreamingCard';

jest.mock('../WorkflowIntentTranscriptExpand', () => ({
    WorkflowIntentTranscriptExpand: ({ agentRunId }: { agentRunId: string }) => (
        <div data-testid="workflow-transcript-mock">transcript:{agentRunId}</div>
    ),
}));

describe('ToolStreamingCard (workflow_intent)', () => {
    const baseTool = {
        tool: 'workflow_intent',
        displayName: 'Workflow agent',
        logs: [] as { tag: string; message: string }[],
        loading: false,
        success: true as boolean | undefined,
        arguments: { goal: 'List workflows' } as Record<string, unknown>,
    };

    it('renders Sub-agent transcript hook when result JSON includes agent_run_id and tool succeeded', () => {
        const resultPayload = JSON.stringify({
            success: true,
            agent_runId: 'should-not-match',
            agent_run_id: 'run-e2e-99',
            summary: 'Listed 3 workflows.',
        });

        render(
            <ToolStreamingCard
                streaming_tool={baseTool}
                result={resultPayload}
                arguments={{ goal: 'List workflows' }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /^Details$/i }));

        expect(screen.getByTestId('workflow-transcript-mock')).toHaveTextContent('transcript:run-e2e-99');
    });

    it('hides transcript expand when tool run failed', () => {
        const resultPayload = JSON.stringify({
            success: false,
            agent_run_id: 'run-fail',
            summary: 'Nope',
        });

        render(
            <ToolStreamingCard
                streaming_tool={{ ...baseTool, success: false }}
                result={resultPayload}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /^Details$/i }));

        expect(screen.queryByTestId('workflow-transcript-mock')).not.toBeInTheDocument();
    });

    it('does not render transcript for other tools even with agent_run_id in JSON', () => {
        const resultPayload = JSON.stringify({ agent_run_id: 'x' });

        render(
            <ToolStreamingCard
                streaming_tool={{ ...baseTool, tool: 'gmail_send' }}
                result={resultPayload}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /^Details$/i }));

        expect(screen.queryByTestId('workflow-transcript-mock')).not.toBeInTheDocument();
    });
});
