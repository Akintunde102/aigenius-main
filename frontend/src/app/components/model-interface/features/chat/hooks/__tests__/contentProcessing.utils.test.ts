import {
    mergeContentBlocks,
    contentToDisplayText,
    contentToMarkdownText,
    processStreamingContent,
} from '../contentProcessing.utils';
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

    it('keeps image urls when a later text chunk arrives as a string', () => {
        const withImage = [
            { type: CONTENT_TYPES.TEXT, text: 'See ' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/cat.png' } },
        ];

        const result = mergeContentBlocks(withImage as any, ' this');

        expect(result).toEqual([
            { type: CONTENT_TYPES.TEXT, text: 'See  this' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/cat.png' } },
        ]);
    });

    it('keeps every image url when another image is appended after an error retry chunk', () => {
        const first = [
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/one.png' } },
        ];
        const second = [
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/two.png' } },
        ];

        const result = mergeContentBlocks(first as any, second as any);

        expect(result).toEqual([
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/one.png' } },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://cdn.example/two.png' } },
        ]);
    });
});

describe('processStreamingContent', () => {
    it('preserves image_url blocks from array chunks', () => {
        const result = processStreamingContent([
            { type: CONTENT_TYPES.TEXT, text: 'caption' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/1.png' } },
        ]);

        expect(result).toEqual([
            { type: CONTENT_TYPES.TEXT, text: 'caption', image_url: undefined, input_audio: undefined },
            {
                type: CONTENT_TYPES.IMAGE_URL,
                text: undefined,
                image_url: { url: 'https://img.test/1.png' },
                input_audio: undefined,
            },
        ]);
    });
});

describe('contentToMarkdownText', () => {
    it('emits markdown images instead of a placeholder', () => {
        const blocks = [
            { type: CONTENT_TYPES.TEXT, text: 'caption ' },
            { type: CONTENT_TYPES.IMAGE_URL, image_url: { url: 'https://img.test/1.png' } },
        ];
        expect(contentToMarkdownText(blocks as any)).toBe('caption \n![image](https://img.test/1.png)\n');
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
