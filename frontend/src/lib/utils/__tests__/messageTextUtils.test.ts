import { textPartToPlainString, valueToDisplayString } from '../messageTextUtils';

describe('textPartToPlainString', () => {
    it('returns strings unchanged', () => {
        expect(textPartToPlainString('hello')).toBe('hello');
    });

    it('stringifies numbers and booleans', () => {
        expect(textPartToPlainString(42)).toBe('42');
        expect(textPartToPlainString(true)).toBe('true');
    });

    it('flattens a single OpenAI-style part object', () => {
        expect(textPartToPlainString({ type: 'text', text: 'hi' })).toBe('hi');
    });

    it('joins an array of token parts', () => {
        expect(
            textPartToPlainString([
                { type: 'text', text: 'a' },
                { type: 'text', text: 'b' },
            ]),
        ).toBe('ab');
    });

    it('handles nested text fields', () => {
        expect(
            textPartToPlainString({
                type: 'text',
                text: { type: 'text', text: 'nested' },
            }),
        ).toBe('nested');
    });

    it('uses content when text is absent', () => {
        expect(textPartToPlainString({ type: 'text', content: 'from content' } as unknown)).toBe(
            'from content',
        );
    });
});

describe('valueToDisplayString', () => {
    it('flattens content parts like textPartToPlainString', () => {
        expect(valueToDisplayString({ type: 'text', text: 'hi' })).toBe('hi');
    });

    it('JSON-serializes plain objects with no extractable text', () => {
        expect(valueToDisplayString({ foo: 1 })).toBe('{"foo":1}');
    });
});
