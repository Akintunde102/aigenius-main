import {
    appendThinkingChunk,
    applyStreamingTurnUpdate,
    enrichEventsWithLegacyThinking,
    extractReasoningChunk,
    finalizeOpenThinkingEvent,
} from '../thinkingEvent.utils';
import type { MessageEvent } from '@/app/components/model-interface/shared/types';

describe('thinkingEvent.utils', () => {
    it('extracts reasoning from reasoning_details when reasoning string is absent', () => {
        expect(extractReasoningChunk(undefined, [{ text: 'step one' }])).toBe('step one');
    });

    it('appends to an open thinking event and finalizes before text', () => {
        const events: MessageEvent[] = [];
        appendThinkingChunk(events, 'alpha ');
        appendThinkingChunk(events, 'beta');
        expect(events).toHaveLength(1);
        expect(events[0]).toMatchObject({ type: 'thinking', content: 'alpha beta', loading: true });

        finalizeOpenThinkingEvent(events);
        events.push({ type: 'text', content: 'Hello' });

        appendThinkingChunk(events, 'more thought');
        expect(events).toHaveLength(3);
        expect(events[1]).toMatchObject({ type: 'text', content: 'Hello' });
        expect(events[2]).toMatchObject({ type: 'thinking', content: 'more thought', loading: true });
    });

    it('applyStreamingTurnUpdate interleaves thinking and text chunks', () => {
        const events = applyStreamingTurnUpdate([], {
            reasoning: 'Thinking first',
        });
        const next = applyStreamingTurnUpdate(events, {
            textChunk: 'Visible answer',
        });

        expect(next).toEqual([
            { type: 'thinking', content: 'Thinking first', loading: false, timestamp: expect.any(Number) },
            { type: 'text', content: 'Visible answer' },
        ]);
    });

    it('enrichEventsWithLegacyThinking prepends legacy reasoning once', () => {
        const events = enrichEventsWithLegacyThinking(
            [{ type: 'text', content: 'Answer' }],
            { reasoning: 'Legacy thought', timestamp: 42 },
        );

        expect(events).toHaveLength(2);
        expect(events[0]).toMatchObject({ type: 'thinking', content: 'Legacy thought', loading: false, timestamp: 42 });
        expect(events[1]).toMatchObject({ type: 'text', content: 'Answer' });
    });
});
