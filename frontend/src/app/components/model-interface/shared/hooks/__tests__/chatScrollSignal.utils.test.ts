import { computeLastMessageScrollSignal } from '../chatScrollSignal.utils';
import { ChatMessage } from '@/app/components/model-interface/shared/types';

describe('computeLastMessageScrollSignal', () => {
    it('returns 0 for an empty chat', () => {
        expect(computeLastMessageScrollSignal([])).toBe(0);
    });

    it('grows when the last message content grows', () => {
        const short: ChatMessage[] = [{ role: 'assistant', content: 'hi', timestamp: 1 }];
        const long: ChatMessage[] = [{ role: 'assistant', content: 'hello world', timestamp: 1 }];

        expect(computeLastMessageScrollSignal(long)).toBeGreaterThan(
            computeLastMessageScrollSignal(short),
        );
    });

    it('includes reasoning and events in the signal', () => {
        const base: ChatMessage[] = [{ role: 'assistant', content: 'x', timestamp: 1 }];
        const withExtras: ChatMessage[] = [{
            role: 'assistant',
            content: 'x',
            timestamp: 1,
            reasoning: 'thinking',
            events: [{ type: 'text', content: 'chunk' }],
        }];

        expect(computeLastMessageScrollSignal(withExtras)).toBeGreaterThan(
            computeLastMessageScrollSignal(base),
        );
    });
});
