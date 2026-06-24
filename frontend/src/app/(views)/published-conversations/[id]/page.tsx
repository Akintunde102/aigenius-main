import React from 'react';
import Link from 'next/link';
import {
    getAllPublishedConversations,
    getPublishedConversation,
} from '@/lib/calls/model-chat-conversation';
import PublishedConversationDetailClient from '../components/PublishedConversationDetailClient';

/** Pre-render at build; revalidate in background (static + ISR). */
export const dynamic = 'force-static';

/** Seconds between regenerations after the first static render. */
export const revalidate = 30;

/**
 * Pre-build a static page per published id when the API is reachable at build time.
 * IDs that appear later are still served: first request renders and caches them (`dynamicParams`).
 */
export const dynamicParams = true;

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

export default async function PublishedConversationPage({ params }: PageProps) {
    const { id } = params;
    let conversation = null as Awaited<ReturnType<typeof getPublishedConversation>> | null;
    try {
        conversation = await getPublishedConversation(id);
    } catch (err) {
        conversation = null;
    }

    if (!conversation) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
                <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-900/70 px-8 py-10">
                    <h1 className="text-xl font-semibold text-white">Conversation not found</h1>
                    <p className="mt-3 text-sm text-zinc-400">
                        This link may be invalid or the conversation was removed.
                    </p>
                    <Link
                        href="/published-conversations"
                        className="mt-6 inline-flex font-medium text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
                    >
                        Browse published conversations
                    </Link>
                </div>
            </div>
        );
    }

    return <PublishedConversationDetailClient conversation={conversation} />;
}
