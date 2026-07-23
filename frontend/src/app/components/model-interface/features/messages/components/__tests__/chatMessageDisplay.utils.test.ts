import { buildChatMessageDisplayBlocks, getLastTextEventIndex } from '../chatMessageDisplay.utils';
import type { MessageEvent, ToolEvent } from '@/app/components/model-interface/shared/types';

function tool(toolName = 'gmail_search'): ToolEvent {
    return {
        type: 'tool',
        tool: toolName,
        displayName: toolName,
        arguments: {},
        logs: [],
        loading: false,
        success: true,
        result: 'done',
        timestamp: Date.now(),
    };
}

describe('chatMessageDisplay.utils', () => {
    it('coalesces contiguous text events and preserves tool separators', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: '## Title' },
            { type: 'text', content: '\n\nBody text' },
            tool(),
            { type: 'text', content: '\n\n### Plan' },
            { type: 'text', content: '\n1. Step one' },
        ];

        const blocks = buildChatMessageDisplayBlocks(events, { streaming: false });

        expect(blocks).toEqual([
            { type: 'text', content: '## Title\n\nBody text', endsWithLastTextEvent: false },
            { type: 'tool', event: expect.objectContaining({ tool: 'gmail_search' }) },
            { type: 'text', content: '\n\n### Plan\n1. Step one', endsWithLastTextEvent: true },
        ]);
    });

    it('tracks the final text-bearing block for the stream cursor', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: 'First' },
            tool(),
            { type: 'text', content: 'Second' },
            { type: 'text', content: ' third' },
        ];

        expect(getLastTextEventIndex(events)).toBe(3);

        const blocks = buildChatMessageDisplayBlocks(events, { streaming: true });
        expect(blocks[0]).toEqual({ type: 'text', content: 'First', endsWithLastTextEvent: false });
        expect(blocks[2]).toEqual({ type: 'text', content: 'Second third', endsWithLastTextEvent: true });
    });

    it('closes an unfinished fenced code block only for the last streaming text block', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: '```ts\nconst x = 1;' },
        ];

        const blocks = buildChatMessageDisplayBlocks(events, { streaming: true });

        expect(blocks).toEqual([
            { type: 'text', content: '```ts\nconst x = 1;\n```', endsWithLastTextEvent: true },
        ]);
    });

    it('does not modify completed fenced code blocks', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: '```ts\nconst x = 1;\n```' },
        ];

        const blocks = buildChatMessageDisplayBlocks(events, { streaming: true });

        expect(blocks).toEqual([
            { type: 'text', content: '```ts\nconst x = 1;\n```', endsWithLastTextEvent: true },
        ]);
    });

    it('preserves thinking blocks inline between text and tools', () => {
        const events: MessageEvent[] = [
            {
                type: 'thinking',
                content: 'Let me reason this through.',
                loading: false,
                timestamp: 1,
            },
            { type: 'text', content: 'Answer.' },
            tool(),
        ];

        const blocks = buildChatMessageDisplayBlocks(events, { streaming: false });

        expect(blocks).toEqual([
            {
                type: 'thinking',
                event: expect.objectContaining({ content: 'Let me reason this through.' }),
            },
            { type: 'text', content: 'Answer.', endsWithLastTextEvent: true },
            { type: 'tool', event: expect.objectContaining({ tool: 'gmail_search' }) },
        ]);
    });
});
