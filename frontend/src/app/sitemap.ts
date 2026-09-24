import type { MetadataRoute } from 'next';
import { getAllPublishedConversations } from '@/lib/calls/model-chat-conversation';
import { getAllHostedFiles } from '@/lib/calls/hosted-file';
import {
    AIGENIUS_PUBLIC_ORIGIN,
    publishedConversationAbsoluteUrl,
} from '@/app/(views)/published-conversations/publishedConversationSeo.utils';
import { hostedFileAbsoluteUrl } from '@/app/(views)/h/hostedFileSeo.utils';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();
    const entries: MetadataRoute.Sitemap = [
        {
            url: AIGENIUS_PUBLIC_ORIGIN,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${AIGENIUS_PUBLIC_ORIGIN}/published-conversations`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 0.8,
        },
        {
            url: `${AIGENIUS_PUBLIC_ORIGIN}/h`,
            lastModified: now,
            changeFrequency: 'hourly',
            priority: 0.8,
        },
    ];

    try {
        const conversations = await getAllPublishedConversations();
        for (const conversation of conversations) {
            if (!conversation?.id) continue;
            const stamp = conversation.updatedAt || conversation.publishedAt;
            entries.push({
                url: publishedConversationAbsoluteUrl(conversation.id),
                lastModified: stamp ? new Date(stamp) : now,
                changeFrequency: 'weekly',
                priority: 0.6,
            });
        }
    } catch {
        /* Hub URLs still ship if the API is unreachable at build time. */
    }

    try {
        const files = await getAllHostedFiles();
        for (const file of files) {
            if (!file?.slug) continue;
            const stamp = file.updatedAt || file.publishedAt;
            entries.push({
                url: hostedFileAbsoluteUrl(file.slug),
                lastModified: stamp ? new Date(stamp) : now,
                changeFrequency: 'weekly',
                priority: 0.7,
            });
        }
    } catch {
        /* Hosted-page URLs still ship if the API is unreachable at build time. */
    }

    return entries;
}
