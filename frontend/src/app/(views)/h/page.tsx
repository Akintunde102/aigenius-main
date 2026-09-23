import React from 'react';
import type { Metadata } from 'next';
import { getAllHostedFiles } from '@/lib/calls/hosted-file';
import HostedFilesClient from './components/HostedFilesClient';
import { buildHostedFilesCollectionJsonLd } from './hostedFileSeo.utils';

const HUB_TITLE = 'Hosted Markdown';
const HUB_DESCRIPTION =
    'Read public Markdown notes and guides hosted on AIGenius. Search freely, then sign in to publish a page of your own.';

export const metadata: Metadata = {
    title: HUB_TITLE,
    description: HUB_DESCRIPTION,
    keywords: ['AIGenius', 'hosted markdown', 'public notes', 'guides', 'Markdown'],
    alternates: { canonical: '/h' },
    openGraph: {
        type: 'website',
        title: HUB_TITLE,
        description: HUB_DESCRIPTION,
        url: '/h',
        siteName: 'AIGenius',
        images: [
            {
                url: '/images/home-hero-dark.png',
                width: 1200,
                height: 630,
                alt: 'AIGenius hosted Markdown',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: HUB_TITLE,
        description: HUB_DESCRIPTION,
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

export const dynamic = 'force-static';
export const revalidate = 30;

export default async function HostedFilesPage() {
    let files = [] as Awaited<ReturnType<typeof getAllHostedFiles>>;
    try {
        files = await getAllHostedFiles();
    } catch {
        files = [];
    }

    const jsonLd = buildHostedFilesCollectionJsonLd(files);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <HostedFilesClient files={files} />
        </>
    );
}
