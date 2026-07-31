import { optimizeMessagesForAPI } from '../messageOptimization.utils';
import { ChatMessage } from '@/app/components/model-interface/shared/types';

describe('optimizeMessagesForAPI', () => {
    it('strips events and thinking from outbound API payload but highlights tool calls in content', () => {
        const messages: ChatMessage[] = [
            {
                id: 'u1',
                role: 'user',
                content: 'Replay this thread',
                timestamp: 1,
            },
            {
                id: 'a1',
                role: 'assistant',
                content: 'I used tools before',
                timestamp: 2,
                reasoning: 'hidden chain of thought',
                events: [
                    { type: 'thinking', content: 'planning…', loading: false, timestamp: 2 },
                    { type: 'text', content: 'I used tools before', order: 0 },
                    {
                        type: 'tool',
                        tool: 'search',
                        displayName: 'Search',
                        arguments: { query: 'test' },
                        logs: [{ tag: 'info', message: 'running' }],
                        loading: false,
                        success: true,
                        result: 'ok',
                        timestamp: 2,
                        order: 1,
                    },
                ],
            },
        ];

        const { messages: optimized } = optimizeMessagesForAPI(messages);
        expect(optimized).toHaveLength(2);

        const assistantPayload = optimized[1] as unknown as Record<string, unknown>;
        expect(assistantPayload.role).toBe('assistant');
        expect(assistantPayload.content).toBe('I used tools before\n\n[Called: Search]');
        expect(assistantPayload).not.toHaveProperty('events');
        expect(assistantPayload).not.toHaveProperty('reasoning');
    });

    it('keeps replay history lean across multi-turn threads with event-heavy assistant messages', () => {
        const messages: ChatMessage[] = [
            {
                id: 'u1',
                role: 'user',
                content: 'first prompt',
                timestamp: 1,
            },
            {
                id: 'a1',
                role: 'assistant',
                content: 'first answer',
                timestamp: 2,
                events: [
                    { type: 'text', content: 'first answer', order: 0 },
                    {
                        type: 'tool',
                        tool: 'web_search',
                        displayName: 'Web Search',
                        arguments: { query: 'first' },
                        logs: [{ tag: 'info', message: 'started' }],
                        loading: false,
                        success: true,
                        result: 'done',
                        timestamp: 2,
                        order: 1,
                    },
                ],
            },
            {
                id: 'u2',
                role: 'user',
                content: 'replay from here',
                timestamp: 3,
            },
            {
                id: 'a2',
                role: 'assistant',
                content: 'second answer',
                timestamp: 4,
                events: [
                    { type: 'text', content: 'second answer', order: 0 },
                    {
                        type: 'tool',
                        tool: 'calculator',
                        displayName: 'Calculator',
                        arguments: { expression: '2+2' },
                        logs: [{ tag: 'info', message: 'computed' }],
                        loading: false,
                        success: true,
                        result: '4',
                        timestamp: 4,
                        order: 1,
                    },
                ],
            },
        ];

        const replaySnapshot = messages.slice(0, 3);
        const { messages: optimized } = optimizeMessagesForAPI(replaySnapshot);

        expect(optimized).toHaveLength(3);
        const assistantPayload = optimized[1] as unknown as Record<string, unknown>;
        expect(assistantPayload.content).toBe('first answer\n\n[Called: Web Search]');
        expect(assistantPayload).not.toHaveProperty('events');
        expect(optimized.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
    });
});
