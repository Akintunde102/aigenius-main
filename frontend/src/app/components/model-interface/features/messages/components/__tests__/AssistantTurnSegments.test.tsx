import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssistantTurnSegments } from '../AssistantTurnSegments';
import type { AssistantRenderSegment } from '../../../chat/components/assistant-turn-summary.utils';

jest.mock('@/app/components/model-interface/features/chat/components/ToolStreamingCard', () => ({
    ToolStreamingCard: ({ streaming_tool }: { streaming_tool: { displayName?: string; loading?: boolean } }) => (
        <div data-testid="tool-streaming-card" data-loading={streaming_tool.loading ? 'yes' : 'no'}>
            {streaming_tool.displayName || 'Tool'}
        </div>
    ),
}));

jest.mock('@/app/components/model-interface/features/chat/components/ToolStreamingGroup', () => ({
    ToolStreamingGroup: () => <div data-testid="tool-streaming-group" />,
}));

jest.mock('@/app/components/model-interface/features/chat/components/ReasoningGroup', () => ({
    ReasoningGroup: () => <div data-testid="reasoning-group" />,
}));

jest.mock('@/app/components/model-interface/features/chat/components/AssistantWorkSummary', () => ({
    AssistantWorkSummary: () => <div data-testid="assistant-work-summary" />,
}));

jest.mock('@/app/components/model-interface/features/message-types', () => ({
    TextMessage: ({ content }: { content: string }) => <div data-testid="text-message">{content}</div>,
}));

describe('AssistantTurnSegments', () => {
    it('returns null when segments is empty', () => {
        const { container } = render(
            <AssistantTurnSegments
                segments={[]}
                messageRole="assistant"
                streaming={true}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('renders text segment correctly', () => {
        const segments: AssistantRenderSegment[] = [
            {
                type: 'block',
                block: {
                    type: 'text',
                    content: 'Hello, this is assistant text.',
                    endsWithLastTextEvent: true,
                },
            },
        ];

        render(
            <AssistantTurnSegments
                segments={segments}
                messageRole="assistant"
                streaming={false}
            />,
        );

        expect(screen.getByTestId('text-message')).toBeInTheDocument();
        expect(screen.getByText('Hello, this is assistant text.')).toBeInTheDocument();
    });

    it('renders tool streaming card segment', () => {
        const segments: AssistantRenderSegment[] = [
            {
                type: 'block',
                block: {
                    type: 'tool',
                    event: {
                        type: 'tool',
                        tool: 'web_search',
                        displayName: 'Web Search',
                        arguments: { query: 'test' },
                        logs: [],
                        loading: false,
                        success: true,
                        result: 'result text',
                        timestamp: 1,
                    },
                },
            },
        ];

        render(
            <AssistantTurnSegments
                segments={segments}
                messageRole="assistant"
                streaming={true}
            />,
        );

        expect(screen.getByTestId('tool-streaming-card')).toBeInTheDocument();
        expect(screen.getByText('Web Search')).toBeInTheDocument();
    });

    it('renders reasoning group segment', () => {
        const segments: AssistantRenderSegment[] = [
            {
                type: 'block',
                block: {
                    type: 'thinking',
                    event: {
                        type: 'thinking',
                        content: 'Analyzing problem...',
                        loading: false,
                        timestamp: 1,
                    },
                },
            },
        ];

        render(
            <AssistantTurnSegments
                segments={segments}
                messageRole="assistant"
                streaming={false}
            />,
        );

        expect(screen.getByTestId('reasoning-group')).toBeInTheDocument();
    });

    it('renders tool cluster segment', () => {
        const segments: AssistantRenderSegment[] = [
            {
                type: 'block',
                block: {
                    type: 'tool_cluster',
                    events: [
                        {
                            type: 'tool',
                            tool: 'bash',
                            displayName: 'Terminal',
                            arguments: {},
                            logs: [],
                            loading: false,
                            success: true,
                            timestamp: 1,
                        },
                    ],
                },
            },
        ];

        render(
            <AssistantTurnSegments
                segments={segments}
                messageRole="assistant"
                streaming={false}
            />,
        );

        expect(screen.getByTestId('tool-streaming-group')).toBeInTheDocument();
    });

    it('renders work summary segment', () => {
        const segments: AssistantRenderSegment[] = [
            {
                type: 'work_summary',
                items: [
                    {
                        kind: 'tool',
                        event: {
                            type: 'tool',
                            tool: 'bash',
                            displayName: 'Terminal',
                            arguments: {},
                            logs: [],
                            loading: false,
                            success: true,
                            timestamp: 1,
                        },
                    },
                ],
            },
        ];

        render(
            <AssistantTurnSegments
                segments={segments}
                messageRole="assistant"
                streaming={false}
            />,
        );

        expect(screen.getByTestId('assistant-work-summary')).toBeInTheDocument();
    });
});
