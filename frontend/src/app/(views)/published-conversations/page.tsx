import React from 'react';
import type { Metadata } from 'next';
import { getAllPublishedConversations } from '@/lib/calls/model-chat-conversation';
import PublishedConversationsClient from './components/PublishedConversationsClient';

export const metadata: Metadata = {
    title: 'Published conversations',
    description: 'Read public AI conversations shared on AIGenius. Explore real chats, then sign in to start your own.',
    alternates: { canonical: '/published-conversations' },
    openGraph: {
        type: 'website',
        title: 'Published conversations',
        description: 'Read public AI conversations shared on AIGenius.',
        url: '/published-conversations',
        siteName: 'AIGenius',
    },
};

/** Pre-render at build; revalidate in background (static + ISR). */
export const dynamic = 'force-static';

/** Seconds between regenerations after the first static render. */
export const revalidate = 30;

export default async function PublishedConversationsPage() {
    let conversations = [] as Awaited<ReturnType<typeof getAllPublishedConversations>>;
    try {
        conversations = await getAllPublishedConversations();
    } catch (err) {
        conversations = [];
    }

    return (
        <PublishedConversationsClient conversations={conversations} />
    );
}
