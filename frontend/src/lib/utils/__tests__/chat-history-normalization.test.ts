import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { getSessionTotalCost } from '@/lib/utils/chatCostUtils';

describe('chat history normalization and costs', () => {
    it('backfills missing message modelId from the saved session modelId', () => {
        const normalized = normalizeSessionMessages({
            id: 'session-1',
            title: 'History',
            modelId: 'gpt-4o-mini',
            messages: [
                { role: 'user' as const, content: 'Hello', timestamp: 1 },
                { role: 'assistant' as const, content: 'Hi', timestamp: 2, modelId: 'gpt-4o' },
            ],
        });

        expect(normalized.messages?.[0].modelId).toBe('gpt-4o-mini');
        expect(normalized.messages?.[1].modelId).toBe('gpt-4o');
    });

    it('prefers stored backend session totalCost over summing message costs', () => {
        const totalCost = getSessionTotalCost(
            {
                id: 'session-2',
                title: 'Stored totals',
                modelId: 'gpt-4o',
                metadata: { totalCost: 1.25 },
                messages: [
                    { role: 'assistant' as const, content: 'Hi', timestamp: 2, cost: 0.2 },
                ],
            },
            [
                {
                    id: 'gpt-4o',
                    name: 'GPT-4o',
                    description: 'test',
                    context_length: 128000,
                    pricing: { prompt: '1', completion: '1' },
                },
            ],
        );

        expect(totalCost).toBe(1.25);
    });

    it('sums only persisted message costs when session metadata has no totalCost', () => {
        const totalCost = getSessionTotalCost(
            {
                id: 'session-3',
                title: 'No metadata',
                modelId: 'gpt-4o',
                messages: [
                    { role: 'assistant' as const, content: 'A', timestamp: 1, cost: 0.1 },
                    { role: 'assistant' as const, content: 'B', timestamp: 2, cost: 0.2 },
                ],
            },
            [],
        );

        expect(totalCost).toBeCloseTo(0.3);
    });
});
