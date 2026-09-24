import {
    buildHostedFileDescription,
    buildHostedFileFaq,
    buildHostedFileJsonLd,
    buildHostedFileKeywords,
    buildHostedFilesCollectionJsonLd,
    estimateHostedReadingMinutes,
    hostedFileAbsoluteUrl,
    hostedFileAuthorName,
    hostedFileCanonicalPath,
    hostedFileDownloadName,
    hostedHeadingId,
    listHostedMarkdownHeadings,
} from '../hostedFileSeo.utils';
import type { HostedFilePublic } from '@/lib/calls/hosted-file';

const file: HostedFilePublic = {
    id: 'hf-1',
    userId: 'user-1',
    slug: 'nigerian-suffrage',
    title: 'Nigerian Suffrage',
    description: '',
    markdownContent: [
        '# Nigerian Suffrage',
        '',
        'Women in Nigeria gained voting rights in stages across the twentieth century.',
        '',
        '## When did women vote?',
        '',
        'Southern regions expanded the franchise after 1950, while the north followed later.',
        '',
        '## Why does this matter?',
        '',
        'The timeline shows how regional politics shaped who could participate in elections.',
        '',
        '```md',
        '# Not a heading',
        '```',
        '',
        '## Methods',
        '',
        'Primary sources and election ordinances.',
    ].join('\n'),
    markdownS3Link: 'https://cdn.example.com/nigerian-suffrage.md',
    contentHash: 'abc',
    publishedAt: '2026-09-21T20:10:00.000Z',
    updatedAt: '2026-09-21T20:12:00.000Z',
    user: { firstName: 'jegede', lastName: 'akintunde' },
};

describe('hosted file SEO text', () => {
    it('builds a meta description from the first paragraph when no blurb is set', () => {
        const description = buildHostedFileDescription(file);
        expect(description.toLowerCase()).toContain('women in nigeria');
        expect(description.length).toBeLessThanOrEqual(160);
        expect(description).not.toContain('#');
    });

    it('prefers the publisher description and clamps it', () => {
        const description = buildHostedFileDescription({
            ...file,
            description: `${'Nigerian voting rights '.repeat(20)}end`,
        });
        expect(description.startsWith('Nigerian voting rights')).toBe(true);
        expect(description.endsWith('…')).toBe(true);
        expect(description.length).toBeLessThanOrEqual(160);
    });

    it('extracts headings and skips fenced code headings', () => {
        const headings = listHostedMarkdownHeadings(file.markdownContent);
        expect(headings.map((heading) => heading.text)).toEqual([
            'Nigerian Suffrage',
            'When did women vote?',
            'Why does this matter?',
            'Methods',
        ]);
        expect(headings[1].id).toBe(hostedHeadingId('When did women vote?'));
    });

    it('disambiguates duplicate heading ids', () => {
        const headings = listHostedMarkdownHeadings('# Intro\n\n## Intro\n');
        expect(headings[0].id).toBe('intro');
        expect(headings[1].id).toBe('intro-2');
    });
});

describe('hosted file structured data', () => {
    it('emits Article and BreadcrumbList JSON-LD that agree with the canonical URL', () => {
        const jsonLd = buildHostedFileJsonLd(file);
        const url = hostedFileAbsoluteUrl(file.slug);
        expect(hostedFileCanonicalPath(file.slug)).toBe('/h/nigerian-suffrage');
        expect(url).toContain('/h/nigerian-suffrage');
        expect(jsonLd['@context']).toBe('https://schema.org');
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const article = graph.find((node) => node['@type'] === 'Article');
        const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList');
        expect(article?.headline).toBe('Nigerian Suffrage');
        expect(article?.url).toBe(url);
        expect(article?.mainEntityOfPage).toBe(url);
        expect(String(article?.articleBody)).toContain('Women in Nigeria');
        expect(article?.isAccessibleForFree).toBe(true);
        expect(hostedFileAuthorName(file.user)).toBe('jegede akintunde');
        expect(JSON.stringify(crumbs)).toContain('/h');
    });

    it('marks restricted pages as not free in JSON-LD', () => {
        const jsonLd = buildHostedFileJsonLd({ ...file, visibility: 'restricted' });
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const article = graph.find((node) => node['@type'] === 'Article');
        expect(article?.isAccessibleForFree).toBe(false);
    });

    it('adds FAQPage only when two or more question headings have answers', () => {
        const jsonLd = buildHostedFileJsonLd(file);
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const faq = graph.find((node) => node['@type'] === 'FAQPage');
        expect(faq).toBeTruthy();
        const entities = faq?.mainEntity as Array<{ name: string }>;
        expect(entities.length).toBeGreaterThanOrEqual(2);
        expect(entities[0].name).toContain('women vote');
    });

    it('omits FAQPage for a page with no questions', () => {
        const jsonLd = buildHostedFileJsonLd({
            ...file,
            markdownContent: '# Guide\n\nJust a paragraph about tools.',
        });
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        expect(graph.find((node) => node['@type'] === 'FAQPage')).toBeUndefined();
        expect(buildHostedFileFaq('# Guide\n\nJust a paragraph.')).toEqual([]);
    });

    it('includes content keywords and a markdown download name', () => {
        const keywords = buildHostedFileKeywords(file);
        expect(keywords).toContain('AIGenius');
        expect(keywords.some((word) => word.includes('nigerian') || word.includes('suffrage'))).toBe(true);
        expect(hostedFileDownloadName(file.title, file.slug)).toBe('nigerian-suffrage.md');
        expect(estimateHostedReadingMinutes(file.markdownContent)).toBeGreaterThanOrEqual(1);
    });
});

describe('hosted files collection structured data', () => {
    it('emits CollectionPage, ItemList, and BreadcrumbList for the hub', () => {
        const jsonLd = buildHostedFilesCollectionJsonLd([file]);
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const collection = graph.find((node) => node['@type'] === 'CollectionPage');
        const list = graph.find((node) => node['@type'] === 'ItemList') as {
            numberOfItems?: number;
            itemListElement?: Array<{ url?: string; name?: string; position?: number }>;
        };
        const crumbs = graph.find((node) => node['@type'] === 'BreadcrumbList');

        expect(collection?.url).toMatch(/\/h$/);
        expect(String(collection?.['@id'])).toContain('/h#collection');
        expect(list?.numberOfItems).toBe(1);
        expect(list?.itemListElement?.[0]?.position).toBe(1);
        expect(list?.itemListElement?.[0]?.url).toBe(hostedFileAbsoluteUrl(file.slug));
        expect(list?.itemListElement?.[0]?.name).toBe(file.title);
        expect(JSON.stringify(crumbs)).toContain('/h');
    });

    it('keeps ItemList empty when no pages are published', () => {
        const jsonLd = buildHostedFilesCollectionJsonLd([]);
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        const list = graph.find((node) => node['@type'] === 'ItemList') as {
            numberOfItems?: number;
            itemListElement?: unknown[];
        };
        expect(list?.numberOfItems).toBe(0);
        expect(list?.itemListElement).toEqual([]);
    });
});
