import { normalizeMessageContent } from '@/lib/utils/messageContentUtils';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export const AIGENIUS_PUBLIC_ORIGIN = 'https://aigenius.noboxlabs.xyz';

const META_DESCRIPTION_MAX = 160;
const ARTICLE_BODY_MAX = 4000;
const FAQ_LIMIT = 6;
const KEYWORD_LIMIT = 8;

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'how',
    'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'was',
    'what', 'with', 'you', 'your',
]);

export interface PublishedConversationPublicMessage {
    role?: string;
    content?: unknown;
    modelName?: string;
    personaName?: string;
    events?: Array<{
        type?: string;
        content?: unknown;
        displayName?: string;
        tool?: string;
    }>;
}

export interface PublishedConversationPublicInput {
    id: string;
    publishedTitle?: string;
    publishedDescription?: string;
    publishedAt?: string;
    updatedAt?: string;
    user?: { firstName?: string; lastName?: string } | null;
    session?: { messages?: PublishedConversationPublicMessage[] } | null;
}

export function publishedConversationAuthorName(
    user?: { firstName?: string; lastName?: string } | null,
): string {
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return name || 'Anonymous';
}

export function publishedConversationCanonicalPath(id: string): string {
    return `/published-conversations/${id}`;
}

export function publishedConversationAbsoluteUrl(id: string): string {
    return `${AIGENIUS_PUBLIC_ORIGIN}${publishedConversationCanonicalPath(id)}`;
}

/** Readable text for one turn. Prefers event text over raw content objects. */
export function publishedMessageReadableText(message: PublishedConversationPublicMessage): string {
    const fromEvents = readableTextFromEvents(message.events);
    if (fromEvents) return fromEvents;
    return readableTextFromContent(message.content);
}

export function publishedConversationSpeaker(
    message: PublishedConversationPublicMessage,
): string {
    if (message.role === 'user') return 'You';
    const name = message.personaName?.trim() || message.modelName?.trim();
    return name || 'Assistant';
}

export function buildPublishedConversationDescription(
    conversation: PublishedConversationPublicInput,
): string {
    const provided = collapseWhitespace(conversation.publishedDescription ?? '');
    if (provided) return clampText(provided, META_DESCRIPTION_MAX);

    const messages = conversation.session?.messages ?? [];
    const firstUser = messages.find((message) => message.role === 'user');
    const firstAssistant = messages.find((message) => message.role === 'assistant');
    const question = firstUser ? searchSnippet(firstLine(publishedMessageReadableText(firstUser))) : '';
    const answer = firstAssistant ? searchSnippet(publishedMessageReadableText(firstAssistant)) : '';
    const combined = [question, answer].filter(Boolean).join(' ');
    if (combined) return clampText(combined, META_DESCRIPTION_MAX);

    const title = conversation.publishedTitle?.trim();
    if (title) {
        return clampText(
            `${title}. A public AI conversation on AIGenius.`,
            META_DESCRIPTION_MAX,
        );
    }
    return 'A public AI conversation on AIGenius.';
}

export function buildPublishedConversationKeywords(
    conversation: PublishedConversationPublicInput,
): string[] {
    const source = [
        conversation.publishedTitle ?? '',
        conversation.publishedDescription ?? '',
    ].join(' ');
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
    return [...unique, 'AIGenius', 'AI conversation'];
}

export interface PublishedConversationQuestion {
    anchorId: string;
    label: string;
}

export function listPublishedConversationQuestions(
    messages: PublishedConversationPublicMessage[] | undefined,
): PublishedConversationQuestion[] {
    if (!messages?.length) return [];
    const questions: PublishedConversationQuestion[] = [];
    messages.forEach((message, index) => {
        if (message.role !== 'user') return;
        const text = proseOnly(
            publishedMessageReadableText(message).split('\n').map((line) => line.trim()).find(Boolean) ?? '',
        );
        if (!text) return;
        questions.push({
            anchorId: publishedMessageAnchorId(index),
            label: clampText(text, 88),
        });
    });
    return questions;
}

export function publishedMessageAnchorId(index: number): string {
    return `published-message-${index}`;
}

export function buildPublishedConversationFaq(
    messages: PublishedConversationPublicMessage[] | undefined,
): Array<{ question: string; answer: string }> {
    if (!messages?.length) return [];
    const pairs: Array<{ question: string; answer: string }> = [];
    for (let index = 0; index < messages.length; index += 1) {
        const message = messages[index];
        if (message.role !== 'user') continue;
        const answerMessage = messages.slice(index + 1).find((candidate) => candidate.role === 'assistant');
        const question = proseOnly(publishedMessageReadableText(message));
        const answer = answerMessage ? proseOnly(publishedMessageReadableText(answerMessage)) : '';
        if (question.length < 8 || answer.length < 40) continue;
        pairs.push({
            question: clampText(question, 240),
            answer: clampText(answer, 500),
        });
        if (pairs.length >= FAQ_LIMIT) break;
    }
    return pairs;
}

export function buildPublishedConversationJsonLd(
    conversation: PublishedConversationPublicInput,
): Record<string, unknown> {
    const title = conversation.publishedTitle?.trim() || 'Published conversation';
    const description = buildPublishedConversationDescription(conversation);
    const url = publishedConversationAbsoluteUrl(conversation.id);
    const author = publishedConversationAuthorName(conversation.user);
    const messages = conversation.session?.messages ?? [];
    const articleBody = clampText(
        messages
            .map((message) => proseOnly(publishedMessageReadableText(message)))
            .filter(Boolean)
            .join('\n\n'),
        ARTICLE_BODY_MAX,
    );
    const faq = buildPublishedConversationFaq(messages);

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
                    name: 'Published conversations',
                    item: `${AIGENIUS_PUBLIC_ORIGIN}/published-conversations`,
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
            isAccessibleForFree: true,
            datePublished: conversation.publishedAt,
            dateModified: conversation.updatedAt || conversation.publishedAt,
            author: { '@type': 'Person', name: author },
            publisher: { '@id': `${AIGENIUS_PUBLIC_ORIGIN}/#organization` },
            mainEntityOfPage: url,
            url,
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

export function buildPublishedConversationMarkdown(
    conversation: PublishedConversationPublicInput,
): string {
    const title = conversation.publishedTitle?.trim() || 'Published conversation';
    const author = publishedConversationAuthorName(conversation.user);
    const lines: string[] = [`# ${title}`, ''];
    const description = conversation.publishedDescription?.trim();
    if (description) {
        lines.push(description, '');
    }
    const published = conversation.publishedAt
        ? new Date(conversation.publishedAt).toISOString()
        : '';
    lines.push(`*By ${author}${published ? ` · ${published}` : ''}*`, '', '---', '');

    for (const message of conversation.session?.messages ?? []) {
        const body = publishedMessageReadableText(message);
        if (!body) continue;
        lines.push(`**${publishedConversationSpeaker(message)}**`, '', body, '');
    }

    lines.push('---', '', `Source: ${publishedConversationAbsoluteUrl(conversation.id)}`);
    return lines.join('\n').trim() + '\n';
}

export function publishedConversationDownloadName(title: string | undefined): string {
    const slug = (title ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return `${slug || 'conversation'}.md`;
}

function readableTextFromContent(content: unknown): string {
    const normalized = normalizeMessageContent(content);
    if (Array.isArray(normalized)) {
        return normalized
            .map((block) => textPartToPlainString(block))
            .map((part) => part.trim())
            .filter(Boolean)
            .join('\n\n');
    }
    return textPartToPlainString(normalized).trim();
}

function readableTextFromEvents(
    events: PublishedConversationPublicMessage['events'],
): string {
    if (!events?.length) return '';
    const parts: string[] = [];
    for (const event of events) {
        if (!event || event.type === 'thinking') continue;
        if (event.type === 'text') {
            const text = textPartToPlainString(event.content).trim();
            if (text) parts.push(text);
            continue;
        }
        if (event.type === 'tool') {
            const name = event.displayName?.trim() || event.tool?.trim();
            if (name) parts.push(`(${name})`);
        }
    }
    return parts.join('\n\n').trim();
}

function firstLine(text: string): string {
    return text.split('\n').map((line) => line.trim()).find(Boolean) ?? '';
}

function searchSnippet(text: string): string {
    return proseOnly(text.replace(/https?:\/\/\S+/gi, ' '));
}

function proseOnly(text: string): string {
    return collapseWhitespace(
        text
            .replace(/```[\s\S]*?```/g, ' ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
            .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
            .replace(/^#{1,6}\s+/gm, '')
            .replace(/\(([^)\n]{1,80})\)/g, ' ')
            .replace(/[*_~>#]/g, ' '),
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
