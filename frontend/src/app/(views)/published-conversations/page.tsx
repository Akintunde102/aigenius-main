import React from 'react';
import { getAllPublishedConversations } from '@/lib/calls/model-chat-conversation';
import PublishedConversationsClient from './components/PublishedConversationsClient';

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
