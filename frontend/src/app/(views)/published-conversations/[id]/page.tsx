import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPublishedConversations, getPublishedConversation } from '@/lib/calls/model-chat-conversation';
import PublishedConversationDetailClient from '../components/PublishedConversationDetailClient';
import {
    buildPublishedConversationDescription,
    buildPublishedConversationJsonLd,
    buildPublishedConversationKeywords,
    publishedConversationAuthorName,
    publishedConversationCanonicalPath,
} from '../publishedConversationSeo.utils';

/** Pre-render at build; revalidate in background (static + ISR). */
export const dynamic = 'force-static';

/** Seconds between regenerations after the first static render. */
export const revalidate = 30;

/**
 * Pre-build a static page per published id when the API is reachable at build time.
 * IDs that appear later are still served: first request renders and caches them (`dynamicParams`).
 */
export const dynamicParams = true;

const loadPublishedConversation = cache(async (id: string) => {
    try {
        return await getPublishedConversation(id);
    } catch {
        return null;
    }
});

export async function generateStaticParams() {
    try {
        const conversations = await getAllPublishedConversations();
        return conversations.map((c) => ({ id: c.id }));
    } catch {
        return [];
    }
}

interface PageProps {
    params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const conversation = await loadPublishedConversation(params.id);
    if (!conversation) {
        return {
            title: 'Conversation not found',
            robots: { index: false, follow: false },
        };
    }

    const title = conversation.publishedTitle?.trim() || 'Published conversation';
    const description = buildPublishedConversationDescription(conversation);
    const canonical = publishedConversationCanonicalPath(conversation.id);
    const author = publishedConversationAuthorName(conversation.user);

    return {
        title,
        description,
        keywords: buildPublishedConversationKeywords(conversation),
        authors: [{ name: author }],
        alternates: { canonical },
        openGraph: {
            type: 'article',
            title,
            description,
            url: canonical,
            siteName: 'AIGenius',
            publishedTime: conversation.publishedAt,
            modifiedTime: conversation.updatedAt || conversation.publishedAt,
            authors: [author],
            images: [
                {
                    url: '/images/home-hero-dark.png',
                    width: 1200,
                    height: 630,
                    alt: title,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/images/home-hero-dark.png'],
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    };
}

export default async function PublishedConversationPage({ params }: PageProps) {
    const conversation = await loadPublishedConversation(params.id);

    if (!conversation) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[var(--chat-canvas-bg)] px-4 py-16 text-center text-[var(--app-ink-900)]">
                <div className="max-w-md rounded-2xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-8 py-10">
                    <h1 className="text-xl font-semibold">Conversation not found</h1>
                    <p className="mt-3 text-sm text-[var(--chat-muted-fg)]">
                        This link may be invalid or the conversation was removed.
                    </p>
                    <Link
                        href="/published-conversations"
                        className="mt-6 inline-flex font-medium text-[var(--chat-accent)] underline underline-offset-4"
                    >
                        Browse published conversations
                    </Link>
                </div>
            </div>
        );
    }

    const jsonLd = buildPublishedConversationJsonLd(conversation);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <PublishedConversationDetailClient conversation={conversation} />
        </>
    );
}
