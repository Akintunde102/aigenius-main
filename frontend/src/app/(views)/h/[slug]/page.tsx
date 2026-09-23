import React, { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllHostedFiles, getHostedFileBySlug, isRestrictedHostedFile } from '@/lib/calls/hosted-file';
import HostedMarkdownDetailClient from '../components/HostedMarkdownDetailClient';
import HostedMarkdownAccessClient from '../components/HostedMarkdownAccessClient';
import {
    buildHostedFileDescription,
    buildHostedFileJsonLd,
    buildHostedFileKeywords,
    hostedFileAuthorName,
    hostedFileCanonicalPath,
} from '../hostedFileSeo.utils';

export const dynamic = 'force-static';
export const revalidate = 30;
export const dynamicParams = true;

const loadHostedFile = cache(async (slug: string) => {
    try {
        return await getHostedFileBySlug(slug);
    } catch {
        return null;
    }
});

export async function generateStaticParams() {
    try {
        const files = await getAllHostedFiles();
        return files.map((file) => ({ slug: file.slug }));
    } catch {
        return [];
    }
}

interface PageProps {
    params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const file = await loadHostedFile(params.slug);
    if (!file) {
        return {
            title: 'Page not found',
            robots: { index: false, follow: false },
        };
    }

    if (isRestrictedHostedFile(file)) {
        return {
            title: 'Private page',
            robots: { index: false, follow: false },
        };
    }

    const title = file.title?.trim() || 'Hosted Markdown';
    const description = buildHostedFileDescription(file);
    const canonical = hostedFileCanonicalPath(file.slug);
    const author = hostedFileAuthorName(file.user);

    return {
        title,
        description,
        keywords: buildHostedFileKeywords(file),
        authors: [{ name: author }],
        alternates: { canonical },
        openGraph: {
            type: 'article',
            title,
            description,
            url: canonical,
            siteName: 'AIGenius',
            publishedTime: file.publishedAt,
            modifiedTime: file.updatedAt || file.publishedAt,
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

export default async function HostedMarkdownPage({ params }: PageProps) {
    const file = await loadHostedFile(params.slug);

    if (!file) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[var(--chat-canvas-bg)] px-4 py-16 text-center text-[var(--app-ink-900)]">
                <div className="max-w-md rounded-2xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-8 py-10">
                    <h1 className="text-xl font-semibold">Page not found</h1>
                    <p className="mt-3 text-sm text-[var(--chat-muted-fg)]">
                        This link may be invalid or the page was unpublished.
                    </p>
                    <Link
                        href="/h"
                        className="mt-6 inline-flex font-medium text-[var(--chat-accent)] underline underline-offset-4"
                    >
                        Browse hosted pages
                    </Link>
                </div>
            </div>
        );
    }

    if (isRestrictedHostedFile(file)) {
        return <HostedMarkdownAccessClient slug={file.slug || params.slug} />;
    }

    const jsonLd = buildHostedFileJsonLd(file);

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
            />
            <HostedMarkdownDetailClient file={file} />
        </>
    );
}
