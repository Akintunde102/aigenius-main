import type { MessageEvent } from '@/app/components/model-interface/shared/types';
import { buildCopyTextFromEvents } from '../messageCopyText';

describe('buildCopyTextFromEvents', () => {
    it('interleaves text and tool segments in array order', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: 'First reply.' },
            {
                type: 'tool',
                tool: 'search',
                displayName: 'Search',
                arguments: { q: 'x' },
                logs: [],
                loading: false,
                result: 'ok',
                timestamp: 1,
            },
            { type: 'text', content: 'Final words.' },
        ];
        const out = buildCopyTextFromEvents(events);
        expect(out).toContain('First reply.');
        expect(out).toContain('[Search]');
        expect(out).toContain('"q": "x"');
        expect(out).toContain('Result:\nok');
        expect(out).toContain('Final words.');
        expect(out.indexOf('First reply.')).toBeLessThan(out.indexOf('[Search]'));
        expect(out.indexOf('[Search]')).toBeLessThan(out.indexOf('Final words.'));
    });

    it('follows array order when order fields disagree', () => {
        const events: MessageEvent[] = [
            { type: 'text', content: 'Appears first', order: 99 },
            { type: 'text', content: 'Appears second', order: 0 },
        ];
        const out = buildCopyTextFromEvents(events);
        expect(out.indexOf('Appears first')).toBeLessThan(out.indexOf('Appears second'));
    });

    it('returns empty string for empty events', () => {
        expect(buildCopyTextFromEvents([])).toBe('');
    });

    it('flattens token-shaped text event content', () => {
        const events = [
            { type: 'text' as const, content: { type: 'text', text: 'Hello' } },
        ] as unknown as MessageEvent[];
        expect(buildCopyTextFromEvents(events)).toBe('Hello');
    });
});
