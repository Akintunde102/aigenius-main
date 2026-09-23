import {
    buildPublishedConversationDescription,
    buildPublishedConversationFaq,
    buildPublishedConversationJsonLd,
    buildPublishedConversationKeywords,
    buildPublishedConversationMarkdown,
    listPublishedConversationQuestions,
    publishedConversationDownloadName,
    publishedMessageReadableText,
    type PublishedConversationPublicInput,
} from '../publishedConversationSeo.utils';

const structuredConversation: PublishedConversationPublicInput = {
    id: 'suffrage-1',
    publishedTitle: 'Nigerian Suffrage',
    publishedDescription: '',
    publishedAt: '2026-09-21T20:10:00.000Z',
    updatedAt: '2026-09-21T20:12:00.000Z',
    user: { firstName: 'jegede', lastName: 'akintunde' },
    session: {
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'What is this?' },
                    { type: 'text', text: 'convo.md: https://example.com/convo.md' },
                ],
            },
            {
                role: 'assistant',
                modelName: 'Claude',
                events: [
                    { type: 'tool', tool: 'web_fetch', displayName: 'web fetch' },
                    {
                        type: 'text',
                        content: 'Colonial Era and Early Exclusion (1922-1945). Women were barred from the franchise.',
                    },
                ],
            },
        ],
    },
};

describe('published conversation public text', () => {
    it('reads structured user parts as prose instead of JSON', () => {
        const text = publishedMessageReadableText(structuredConversation.session!.messages![0]);
        expect(text).toContain('What is this?');
        expect(text).toContain('convo.md');
        expect(text).not.toContain('"type"');
    });

    it('reads assistant text events and keeps the tool name', () => {
        const text = publishedMessageReadableText(structuredConversation.session!.messages![1]);
        expect(text).toContain('Colonial Era');
        expect(text).toContain('(web fetch)');
    });

    it('returns an empty string when a turn has no readable text', () => {
        expect(publishedMessageReadableText({ role: 'assistant', content: '   ' })).toBe('');
        expect(publishedMessageReadableText({ role: 'user', content: null })).toBe('');
    });
});

describe('published conversation SEO', () => {
    it('builds a meta description from the first exchange when no blurb is set', () => {
        const description = buildPublishedConversationDescription(structuredConversation);
        expect(description.toLowerCase()).toContain('what is this');
        expect(description).toContain('Colonial Era');
        expect(description.length).toBeLessThanOrEqual(160);
        expect(description).not.toContain('{');
    });

    it('prefers the publisher description and clamps it', () => {
        const description = buildPublishedConversationDescription({
            ...structuredConversation,
            publishedDescription: `${'Nigerian voting rights '.repeat(20)}end`,
        });
        expect(description.startsWith('Nigerian voting rights')).toBe(true);
        expect(description.endsWith('…')).toBe(true);
        expect(description.length).toBeLessThanOrEqual(160);
    });

    it('falls back when the conversation has no messages', () => {
        expect(buildPublishedConversationDescription({
            id: 'empty',
            publishedTitle: 'Empty chat',
            session: { messages: [] },
        })).toContain('Empty chat');
    });

    it('builds keywords from the title without stuffing stop words', () => {
        const keywords = buildPublishedConversationKeywords({
            id: 'k',
            publishedTitle: 'The history of Nigerian suffrage and voting',
        });
        expect(keywords).toContain('nigerian');
        expect(keywords).toContain('suffrage');
        expect(keywords).toContain('AIGenius');
        expect(keywords).not.toContain('the');
        expect(keywords.length).toBeLessThanOrEqual(8);
    });

    it('pairs a user question with the following assistant answer', () => {
        const faq = buildPublishedConversationFaq(structuredConversation.session?.messages);
        expect(faq).toHaveLength(1);
        expect(faq[0].question).toContain('What is this?');
        expect(faq[0].answer).toContain('Colonial Era');
    });

    it('skips faq pairs when the assistant turn is too thin', () => {
        expect(buildPublishedConversationFaq([
            { role: 'user', content: 'What is this?' },
            { role: 'assistant', content: 'Hi' },
        ])).toEqual([]);
    });

    it('emits article, breadcrumb, and faq schema with absolute urls', () => {
        const jsonLd = buildPublishedConversationJsonLd(structuredConversation);
        const graph = jsonLd['@graph'] as Array<{ '@type': string }>;
        expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList', 'Article', 'FAQPage']);
        const article = graph[1] as unknown as { url: string; author: { name: string }; headline: string };
        expect(article.headline).toBe('Nigerian Suffrage');
        expect(article.author.name).toBe('jegede akintunde');
        expect(article.url).toBe('https://aigenius.noboxlabs.xyz/published-conversations/suffrage-1');
    });

    it('omits faq schema when there is no real answer', () => {
        const jsonLd = buildPublishedConversationJsonLd({
            id: 'solo',
            publishedTitle: 'Note',
            publishedAt: '2026-01-01T00:00:00.000Z',
            session: { messages: [{ role: 'user', content: 'Hello there friend' }] },
        });
        const graph = jsonLd['@graph'] as Array<{ '@type': string }>;
        expect(graph.map((node) => node['@type'])).toEqual(['BreadcrumbList', 'Article']);
    });
});

describe('published conversation export', () => {
    it('writes markdown with speakers and structured text', () => {
        const markdown = buildPublishedConversationMarkdown(structuredConversation);
        expect(markdown).toContain('# Nigerian Suffrage');
        expect(markdown).toContain('**You**');
        expect(markdown).toContain('What is this?');
        expect(markdown).toContain('**Claude**');
        expect(markdown).toContain('Colonial Era');
        expect(markdown).not.toContain('"type": "text"');
    });

    it('slugs the download filename and falls back when the title is empty', () => {
        expect(publishedConversationDownloadName('Nigerian Suffrage')).toBe('nigerian-suffrage.md');
        expect(publishedConversationDownloadName('   ')).toBe('conversation.md');
    });

    it('lists user turns as in-page questions', () => {
        const questions = listPublishedConversationQuestions(structuredConversation.session?.messages);
        expect(questions).toEqual([
            expect.objectContaining({
                anchorId: 'published-message-0',
                label: expect.stringContaining('What is this?'),
            }),
        ]);
    });
});
