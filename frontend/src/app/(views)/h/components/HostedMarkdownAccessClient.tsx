"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { hasAuthSession } from '@/lib/utils/auth-session';
import { getViewableHostedFileBySlug, type HostedFilePublic } from '@/lib/calls/hosted-file';
import HostedMarkdownDetailClient from './HostedMarkdownDetailClient';

export default function HostedMarkdownAccessClient({ slug }: { slug: string }) {
    const [status, setStatus] = useState<'loading' | 'signin' | 'denied' | 'ready'>('loading');
    const [file, setFile] = useState<HostedFilePublic | null>(null);
    const signInHref = `/login?next=${encodeURIComponent(`/h/${slug}`)}`;

    useEffect(() => {
        const loggedIn = hasAuthSession() || Boolean(getStoredUserDetailsSnapshot());
        if (!loggedIn) {
            setStatus('signin');
            return;
        }

        let cancelled = false;
        void getViewableHostedFileBySlug(slug)
            .then((row) => {
                if (cancelled) return;
                setFile(row);
                setStatus('ready');
            })
            .catch((error: { status?: number; response?: { status?: number } }) => {
                if (cancelled) return;
                const statusCode = error?.status ?? error?.response?.status;
                setStatus(statusCode === 401 ? 'signin' : 'denied');
            });

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (status === 'ready' && file) {
        return <HostedMarkdownDetailClient file={file} />;
    }

    const copy =
        status === 'signin'
            ? {
                title: 'Sign in to view this page',
                body: 'This page is private. Sign in with an invited account to continue.',
            }
            : status === 'denied'
                ? {
                    title: 'You do not have access',
                    body: 'This page is limited to specific people. Ask the publisher to invite you.',
                }
                : {
                    title: 'Opening page',
                    body: 'Checking whether you can view this page.',
                };

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[var(--chat-canvas-bg)] px-4 py-16 text-center text-[var(--app-ink-900)]">
            <div className="max-w-md rounded-2xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-8 py-10">
                <h1 className="text-xl font-semibold">{copy.title}</h1>
                <p className="mt-3 text-sm text-[var(--chat-muted-fg)]">{copy.body}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {status === 'signin' ? (
                        <Link
                            href={signInHref}
                            className="inline-flex h-10 items-center rounded-lg bg-[var(--chat-accent)] px-4 text-sm font-semibold text-white"
                        >
                            Sign in
                        </Link>
                    ) : null}
                    <Link
                        href="/h"
                        className="inline-flex font-medium text-[var(--chat-accent)] underline underline-offset-4"
                    >
                        Browse public pages
                    </Link>
                </div>
            </div>
        </div>
    );
}
