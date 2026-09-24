import { AIGENIUS_PUBLIC_ORIGIN } from '@/app/(views)/published-conversations/publishedConversationSeo.utils';
import type { HostedFilePublic } from '@/lib/calls/hosted-file';

const META_DESCRIPTION_MAX = 160;
const ARTICLE_BODY_MAX = 4000;
const KEYWORD_LIMIT = 8;
const FAQ_LIMIT = 6;
const WORDS_PER_MINUTE = 220;

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how',
    'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
    'what', 'with', 'you', 'your',
]);

export interface HostedMarkdownHeading {
    id: string;
    text: string;
    level: number;
}

export function hostedFileCanonicalPath(slug: string): string {
    return `/h/${slug}`;
}

export function hostedFileAbsoluteUrl(slug: string): string {
    return `${AIGENIUS_PUBLIC_ORIGIN}${hostedFileCanonicalPath(slug)}`;
}

export function hostedFileAuthorName(
    user?: { firstName?: string | null; lastName?: string | null } | null,
): string {
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return name || 'Anonymous';
}

export function hostedFileDownloadName(title: string | undefined, slug: string): string {
    const fromTitle = (title ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return `${fromTitle || slug || 'page'}.md`;
}

export function hostedHeadingId(text: string): string {
    const slug = text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || 'section';
}

export function stripHostedMarkdownFences(markdown: string): string {
    return markdown.replace(/```[\s\S]*?```/g, ' ');
}

export function listHostedMarkdownHeadings(markdown: string): HostedMarkdownHeading[] {
    const seen = new Map<string, number>();
    const headings: HostedMarkdownHeading[] = [];
    for (const line of stripHostedMarkdownFences(markdown).split('\n')) {
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (!match) continue;
        const text = collapseWhitespace(stripMarkdownInline(match[2]));
        if (!text) continue;
        const baseId = hostedHeadingId(text);
        const count = (seen.get(baseId) ?? 0) + 1;
        seen.set(baseId, count);
        headings.push({
            id: count === 1 ? baseId : `${baseId}-${count}`,
            text,
            level: match[1].length,
        });
    }
    return headings;
}

export function estimateHostedReadingMinutes(markdown: string): number {
    const words = collapseWhitespace(stripMarkdownInline(stripHostedMarkdownFences(markdown)))
        .split(' ')
        .filter(Boolean).length;
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function buildHostedFileDescription(file: Pick<HostedFilePublic, 'title' | 'description' | 'markdownContent'>): string {
    const provided = collapseWhitespace(file.description ?? '');
    if (provided) return clampText(provided, META_DESCRIPTION_MAX);

    const body = firstProseParagraph(file.markdownContent ?? '');
    if (body) return clampText(body, META_DESCRIPTION_MAX);

    const title = file.title?.trim();
    if (title) {
        return clampText(`${title}. A public Markdown page on AIGenius.`, META_DESCRIPTION_MAX);
    }
    return 'A public Markdown page hosted on AIGenius.';
}

export function buildHostedFileKeywords(
    file: Pick<HostedFilePublic, 'title' | 'description' | 'markdownContent'>,
): string[] {
    const headingText = listHostedMarkdownHeadings(file.markdownContent ?? '')
        .slice(0, 4)
        .map((heading) => heading.text)
        .join(' ');
    const source = [file.title ?? '', file.description ?? '', headingText].join(' ');
    const words = source
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word));

    const unique: string[] = [];
    for (const word of words) {
        if (!unique.includes(word)) unique.push(word);
        if (unique.length >= KEYWORD_LIMIT - 2) break;
    }
    return [...unique, 'AIGenius', 'Markdown'];
}

export function buildHostedFileFaq(
    markdown: string | undefined,
): Array<{ question: string; answer: string }> {
    if (!markdown) return [];
    const headings = listHostedMarkdownHeadings(markdown).filter((heading) => heading.text.endsWith('?'));
    if (headings.length < 2) return [];

    const pairs: Array<{ question: string; answer: string }> = [];
    const lines = stripHostedMarkdownFences(markdown).split('\n');
    for (const heading of headings) {
        const index = lines.findIndex((line) => line.replace(/^#{1,3}\s+/, '').trim() === heading.text);
        if (index < 0) continue;
        const answer = lines
            .slice(index + 1)
            .map((line) => line.trim())
            .find((line) => line && !/^#{1,6}\s/.test(line));
        if (!answer || answer.length < 24) continue;
        pairs.push({
            question: clampText(heading.text, 240),
            answer: clampText(stripMarkdownInline(answer), 500),
        });
        if (pairs.length >= FAQ_LIMIT) break;
    }
    return pairs;
}

export function buildHostedFileJsonLd(file: HostedFilePublic): Record<string, unknown> {
    const title = file.title?.trim() || 'Hosted Markdown';
    const description = buildHostedFileDescription(file);
    const url = hostedFileAbsoluteUrl(file.slug);
    const author = hostedFileAuthorName(file.user);
    const articleBody = clampText(
        collapseWhitespace(stripMarkdownInline(stripHostedMarkdownFences(file.markdownContent ?? ''))),
        ARTICLE_BODY_MAX,
    );
    const faq = buildHostedFileFaq(file.markdownContent);

    const graph: Record<string, unknown>[] = [
        {
            '@type': 'BreadcrumbList',
            '@id': `${url}#breadcrumb`,
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'AIGenius',
                    item: AIGENIUS_PUBLIC_ORIGIN,
                },
                {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Hosted pages',
                    item: `${AIGENIUS_PUBLIC_ORIGIN}/h`,
                },
                {
                    '@type': 'ListItem',
                    position: 3,
                    name: title,
                    item: url,
                },
            ],
        },
        {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: title,
            description,
            articleBody: articleBody || description,
            inLanguage: 'en',
            isAccessibleForFree: file.visibility !== 'restricted',
            datePublished: file.publishedAt,
            dateModified: file.updatedAt || file.publishedAt,
            author: { '@type': 'Person', name: author },
            publisher: { '@id': `${AIGENIUS_PUBLIC_ORIGIN}/#organization` },
            mainEntityOfPage: url,
            url,
            image: `${AIGENIUS_PUBLIC_ORIGIN}/images/home-hero-dark.png`,
        },
    ];

    if (faq.length > 0) {
        graph.push({
            '@type': 'FAQPage',
            '@id': `${url}#faq`,
            mainEntity: faq.map((pair) => ({
                '@type': 'Question',
                name: pair.question,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: pair.answer,
                },
            })),
        });
    }

    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}

const COLLECTION_ITEM_LIMIT = 50;

export function buildHostedFilesCollectionJsonLd(
    files: Array<Pick<HostedFilePublic, 'slug' | 'title' | 'description' | 'publishedAt' | 'updatedAt'>>,
): Record<string, unknown> {
    const url = `${AIGENIUS_PUBLIC_ORIGIN}/h`;
    const items = files.slice(0, COLLECTION_ITEM_LIMIT);

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'CollectionPage',
                '@id': `${url}#collection`,
                url,
                name: 'Hosted Markdown',
                description:
                    'Public notes and guides published from AIGenius. Read freely, then sign in to host your own.',
                isPartOf: { '@id': `${AIGENIUS_PUBLIC_ORIGIN}/#website` },
                mainEntity: { '@id': `${url}#itemlist` },
            },
            {
                '@type': 'ItemList',
                '@id': `${url}#itemlist`,
                numberOfItems: files.length,
                itemListOrder: 'https://schema.org/ItemListOrderDescending',
                itemListElement: items.map((file, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    url: hostedFileAbsoluteUrl(file.slug),
                    name: file.title,
                })),
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'AIGenius',
                        item: AIGENIUS_PUBLIC_ORIGIN,
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: 'Hosted pages',
                        item: url,
                    },
                ],
            },
        ],
    };
}

function firstProseParagraph(markdown: string): string {
    const withoutFrontmatter = markdown.replace(/^---[\s\S]*?---\s*/, '');
    return stripHostedMarkdownFences(withoutFrontmatter)
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !/^#{1,6}\s/.test(line) && !/^[-*+]\s/.test(line))
        .map((line) => stripMarkdownInline(line))
        .find(Boolean) ?? '';
}

function stripMarkdownInline(value: string): string {
    return collapseWhitespace(
        value
            .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
            .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
            .replace(/[*_~>#`]/g, ' '),
    );
}

function collapseWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function clampText(value: string, max: number): string {
    const text = collapseWhitespace(value);
    if (text.length <= max) return text;
    const sliced = text.slice(0, max - 1);
    const lastSpace = sliced.lastIndexOf(' ');
    const trimmed = (lastSpace > max * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim();
    return `${trimmed}…`;
}
