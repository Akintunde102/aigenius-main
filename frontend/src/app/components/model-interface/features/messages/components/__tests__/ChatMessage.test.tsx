import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatMessage } from '../ChatMessage';
import type { ChatMessage as ChatMessageType, ToolEvent } from '@/app/components/model-interface/shared/types';

jest.mock('@/app/components/model-interface/features/messages/components/MessageHeader', () => ({
    MessageHeader: ({ displayName }: { displayName: string }) => <div data-testid="message-header">{displayName}</div>,
}));

jest.mock('@/app/components/model-interface/features/messages/components/AssistantStreamStatus', () => ({
    AssistantStreamStatus: () => <div data-testid="assistant-stream-status" />,
}));

jest.mock('@/app/components/model-interface/features/messages/components/ActionIcons', () => ({
    ActionIcons: () => <div data-testid="action-icons" />,
}));

jest.mock('@/app/components/model-interface/features/messages/components/CostDisplay', () => ({
    CostDisplay: () => <div data-testid="cost-display" />,
}));

jest.mock('@/app/components/model-interface/features/messages/components/UsageDetailsModal', () => ({
    UsageDetailsModal: () => null,
}));

jest.mock('@/app/components/model-interface/features/chat/components/ThinkingDisplay', () => ({
    ThinkingDisplay: () => <div data-testid="thinking-display" />,
}));

jest.mock('@/app/components/model-interface/features/chat/components/ToolExecutionDisplay', () => ({
    ToolExecutionDisplay: () => <div data-testid="tool-execution-display" />,
}));

jest.mock('@/app/components/model-interface/features/chat/components/ToolStreamingCard', () => ({
    ToolStreamingCard: ({ streaming_tool }: { streaming_tool: { tool: string } }) => (
        <div data-testid="tool-card">{streaming_tool.tool}</div>
    ),
}));

jest.mock('@/app/components/model-interface/features/message-types', () => ({
    ImageMessage: () => <div data-testid="image-message" />,
    AudioMessage: () => <div data-testid="audio-message" />,
    FileMessage: () => <div data-testid="file-message" />,
    StructuredMessage: () => <div data-testid="structured-message" />,
    TextMessage: ({ content, streaming }: { content: string; streaming: boolean }) => (
        <div data-testid="text-message" data-streaming={streaming ? 'yes' : 'no'}>
            {content}
        </div>
    ),
}));

describe('ChatMessage', () => {
    const toolEvent: ToolEvent = {
        type: 'tool',
        tool: 'gmail_search',
        displayName: 'Gmail Search',
        arguments: {},
        logs: [],
        loading: false,
        success: true,
        result: 'done',
        timestamp: Date.now(),
    };

    const baseMessage: ChatMessageType = {
        id: 'assistant-1',
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        modelId: 'grok-4-fast',
        modelName: 'xAI: Grok 4 Fast',
    };

    it('coalesces contiguous text events into single markdown blocks around tool cards', () => {
        render(
            <ChatMessage
                msg={{
                    ...baseMessage,
                    events: [
                        { type: 'text', content: '## Sample Task' },
                        { type: 'text', content: '\n\nAs a test, I will create...' },
                        toolEvent,
                        { type: 'text', content: '\n\n### Plan' },
                        { type: 'text', content: '\n1. Search Gmail' },
                    ],
                }}
                idx={0}
                selectedModel={null}
                showCosts={false}
                onDelete={jest.fn()}
                onSave={jest.fn()}
                onCopy={jest.fn()}
                onReplay={jest.fn()}
                onImagePreview={jest.fn()}
                imagePreview={null}
                setImagePreview={jest.fn()}
                formatCost={jest.fn().mockReturnValue('$0')}
            />,
        );

        const textMessages = screen.getAllByTestId('text-message');
        expect(textMessages).toHaveLength(2);
        expect(textMessages[0]).toHaveTextContent('## Sample Task');
        expect(textMessages[0]).toHaveTextContent('As a test, I will create...');
        expect(textMessages[1]).toHaveTextContent('### Plan');
        expect(textMessages[1]).toHaveTextContent('1. Search Gmail');
        expect(screen.getAllByTestId('tool-card')).toHaveLength(1);
    });

  it('shows the stream cursor only on the last coalesced text block', () => {
        render(
            <ChatMessage
                msg={{
                    ...baseMessage,
                    events: [
                        { type: 'text', content: 'First paragraph.' },
                        toolEvent,
                        { type: 'text', content: '\n\nSecond paragraph' },
                        { type: 'text', content: '\nStill streaming' },
                    ],
                }}
                idx={0}
                selectedModel={null}
                showCosts={false}
                streaming
                onDelete={jest.fn()}
                onSave={jest.fn()}
                onCopy={jest.fn()}
                onReplay={jest.fn()}
                onImagePreview={jest.fn()}
                imagePreview={null}
                setImagePreview={jest.fn()}
                formatCost={jest.fn().mockReturnValue('$0')}
            />,
        );

        const textMessages = screen.getAllByTestId('text-message');
        expect(textMessages).toHaveLength(2);
        expect(textMessages[0]).toHaveAttribute('data-streaming', 'no');
        expect(textMessages[1]).toHaveAttribute('data-streaming', 'yes');
    });

    it('starts an orphan reply on assistant shift-click', () => {
        const onStartOrphanReply = jest.fn();
        render(
            <ChatMessage
                msg={{
                    ...baseMessage,
                    content: 'Open a side thread from here',
                }}
                idx={0}
                selectedModel={null}
                showCosts={false}
                onDelete={jest.fn()}
                onSave={jest.fn()}
                onCopy={jest.fn()}
                onReplay={jest.fn()}
                onStartOrphanReply={onStartOrphanReply}
                onImagePreview={jest.fn()}
                imagePreview={null}
                setImagePreview={jest.fn()}
                formatCost={jest.fn().mockReturnValue('$0')}
            />,
        );

        fireEvent.click(
            screen.getByText('Open a side thread from here'),
            { shiftKey: true },
        );

        expect(onStartOrphanReply).toHaveBeenCalledWith(
            expect.objectContaining({
                message: expect.objectContaining({
                    id: 'assistant-1',
                    role: 'assistant',
                }),
                anchor: expect.objectContaining({
                    surface: 'chat_transcript',
                    anchorZone: 'chat_area',
                }),
            }),
        );
    });

    it('does not start an orphan reply on a normal assistant click', () => {
        const onStartOrphanReply = jest.fn();
        render(
            <ChatMessage
                msg={{
                    ...baseMessage,
                    content: 'Open a side thread from here',
                }}
                idx={0}
                selectedModel={null}
                showCosts={false}
                onDelete={jest.fn()}
                onSave={jest.fn()}
                onCopy={jest.fn()}
                onReplay={jest.fn()}
                onStartOrphanReply={onStartOrphanReply}
                onImagePreview={jest.fn()}
                imagePreview={null}
                setImagePreview={jest.fn()}
                formatCost={jest.fn().mockReturnValue('$0')}
            />,
        );

        fireEvent.click(screen.getByText('Open a side thread from here'));

        expect(onStartOrphanReply).not.toHaveBeenCalled();
    });
});
