import { mergeContentBlocks, contentToDisplayText } from '../contentProcessing.utils';
import { CONTENT_TYPES } from '../chatOperations.constants';

describe('mergeContentBlocks', () => {
    it('appends plain string chunks in order', () => {
        const result = mergeContentBlocks('Hello', ' world');
        expect(result).toBe('Hello world');
    });

    it('merges structured content after accumulated string without clobbering text', () => {
        const newBlocks = [{ type: CONTENT_TYPES.TEXT, text: ' world' }];
        const result = mergeContentBlocks('Hello', newBlocks as any);

        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([{ type: CONTENT_TYPES.TEXT, text: 'Hello world' }]);
    });

    it('preserves non-text blocks and keeps text concatenation stable', () => {
        const start = [{ type: CONTENT_TYPES.TEXT, text: 'A' }];
        const next = [
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/1.png' } },
            { type: CONTENT_TYPES.TEXT, text: 'B' },
        ];

        const result = mergeContentBlocks(start as any, next as any);

        expect(result).toEqual([
            { type: CONTENT_TYPES.TEXT, text: 'AB' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/1.png' } },
        ]);
    });

    it('accepts a single structured block object (streaming token shape)', () => {
        const chunk = { type: CONTENT_TYPES.TEXT, text: 'x' };
        const result = mergeContentBlocks('', chunk as any);
        expect(result).toEqual([{ type: CONTENT_TYPES.TEXT, text: 'x' }]);
    });
});

describe('contentToDisplayText', () => {
    it('flattens nested text parts in blocks', () => {
        const blocks = [
            {
                type: CONTENT_TYPES.TEXT,
                text: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }],
            },
        ];
        expect(contentToDisplayText(blocks as any)).toBe('ab');
    });
});
