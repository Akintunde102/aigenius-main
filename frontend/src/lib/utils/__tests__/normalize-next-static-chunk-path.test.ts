import { normalizeNextStaticChunkPath } from '@/lib/utils/normalize-next-static-chunk-path';

describe('normalizeNextStaticChunkPath', () => {
    it('rewrites double-encoded dynamic route brackets', () => {
        const input =
            '/_next/static/chunks/app/(views)/workflow/%255Bid%255D/page.js';
        expect(normalizeNextStaticChunkPath(input)).toBe(
            '/_next/static/chunks/app/(views)/workflow/%5Bid%5D/page.js',
        );
    });

    it('normalizes lowercase percent-encoded brackets', () => {
        const input =
            '/_next/static/chunks/app/(views)/workflow/%5bid%5d/page.js';
        expect(normalizeNextStaticChunkPath(input)).toBe(
            '/_next/static/chunks/app/(views)/workflow/%5Bid%5D/page.js',
        );
    });

    it('returns null when no rewrite is needed', () => {
        const input =
            '/_next/static/chunks/app/(views)/workflow/%5Bid%5D/page.js';
        expect(normalizeNextStaticChunkPath(input)).toBeNull();
    });

    it('ignores non-static paths', () => {
        expect(normalizeNextStaticChunkPath('/workflow/%255Bid%255D')).toBeNull();
    });

    it('encodes literal dynamic-route brackets in static chunk paths', () => {
        const input =
            '/_next/static/chunks/app/(views)/workflow/[id]/page.js';
        expect(normalizeNextStaticChunkPath(input)).toBe(
            '/_next/static/chunks/app/(views)/workflow/%5Bid%5D/page.js',
        );
    });
});
