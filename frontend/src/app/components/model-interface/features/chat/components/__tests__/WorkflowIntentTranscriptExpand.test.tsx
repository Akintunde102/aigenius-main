import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkflowIntentTranscriptExpand } from '../WorkflowIntentTranscriptExpand';
import type { ChatMessage } from '@/app/components/model-interface/shared/types/types';

jest.mock('@/lib/calls/agent-run', () => ({
    getAgentRunById: jest.fn(),
}));

jest.mock('../ToolStreamingCard', () => ({
    ToolStreamingCard: ({ streaming_tool }: { streaming_tool: { tool: string; displayName: string } }) => (
        <div data-testid={`inner-tool-${streaming_tool.tool}`}>{streaming_tool.displayName}</div>
    ),
}));

jest.mock('../../../message-types', () => ({
    TextMessage: ({ content }: { content: string }) => <span data-testid="text-msg">{content}</span>,
}));

import { getAgentRunById } from '@/lib/calls/agent-run';

const mockGetAgentRunById = getAgentRunById as jest.MockedFunction<typeof getAgentRunById>;

describe('WorkflowIntentTranscriptExpand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('loads transcript on first expand and renders user goal plus nested tool cards', async () => {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Create a digest workflow', timestamp: 1 },
            {
                role: 'assistant',
                content: 'Done.',
                timestamp: 2,
                events: [
                    { type: 'text', content: 'Planning…' },
                    {
                        type: 'tool',
                        tool: 'workflow_inner_create',
                        displayName: 'Create workflow (agent)',
                        arguments: {},
                        logs: [],
                        loading: false,
                        success: true,
                        result: '{"success":true}',
                        timestamp: 3,
                    },
                ],
            },
        ];

        mockGetAgentRunById.mockResolvedValue({
            id: 'run-1',
            userId: 'u1',
            runType: 'workflow_intent',
            correlationId: null,
            conversationId: null,
            parentToolCallId: null,
            messages,
            metadata: null,
            totalCostUsd: 0.01,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        });

        render(<WorkflowIntentTranscriptExpand agentRunId="run-1" />);

        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));

        expect(mockGetAgentRunById).toHaveBeenCalledTimes(1);
        expect(mockGetAgentRunById).toHaveBeenCalledWith('run-1');

        expect(await screen.findByText('Create a digest workflow')).toBeInTheDocument();
        expect(screen.getByText('Planning…')).toBeInTheDocument();
        expect(screen.getByTestId('inner-tool-workflow_inner_create')).toBeInTheDocument();
    });

    it('does not refetch when collapsing and re-expanding', async () => {
        mockGetAgentRunById.mockResolvedValue({
            id: 'run-2',
            userId: 'u1',
            runType: 'workflow_intent',
            correlationId: null,
            conversationId: null,
            parentToolCallId: null,
            messages: [{ role: 'user', content: 'x', timestamp: 1 }],
            metadata: null,
            totalCostUsd: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        });

        render(<WorkflowIntentTranscriptExpand agentRunId="run-2" />);

        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));
        await screen.findByTestId('text-msg');
        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));
        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));

        expect(mockGetAgentRunById).toHaveBeenCalledTimes(1);
    });

    it('shows API error text when getAgentRunById rejects', async () => {
        mockGetAgentRunById.mockRejectedValue(new Error('Agent run not found'));

        render(<WorkflowIntentTranscriptExpand agentRunId="missing" />);

        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));

        expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });

    it('shows empty state when messages array is empty', async () => {
        mockGetAgentRunById.mockResolvedValue({
            id: 'run-empty',
            userId: 'u1',
            runType: 'workflow_intent',
            correlationId: null,
            conversationId: null,
            parentToolCallId: null,
            messages: [],
            metadata: null,
            totalCostUsd: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
        });

        render(<WorkflowIntentTranscriptExpand agentRunId="run-empty" />);

        fireEvent.click(screen.getByRole('button', { name: /Sub-agent transcript/i }));

        expect(await screen.findByText(/No messages recorded/i)).toBeInTheDocument();
    });
});
