import type { MetadataRoute } from 'next';
import { AIGENIUS_PUBLIC_ORIGIN } from '@/app/(views)/published-conversations/publishedConversationSeo.utils';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: ['/', '/published-conversations', '/published-conversations/', '/h', '/h/', '/docs', '/docs/'],
        },
        sitemap: `${AIGENIUS_PUBLIC_ORIGIN}/sitemap.xml`,
    };
}
