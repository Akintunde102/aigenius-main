"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { hasAuthSession } from '@/lib/utils/auth-session';
import { getViewableHostedFileBySlug, type HostedFilePublic } from '@/lib/calls/hosted-file';
import { DISPLAY } from '@/app/components/landing/typography';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';
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
        <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center px-5 py-24 text-center">
            <h1 className={`${DISPLAY} text-4xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-5xl`}>{copy.title}</h1>
            <p className="mt-4 text-lg leading-relaxed text-lp-muted">{copy.body}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                {status === 'signin' ? (
                    <Link
                        href={signInHref}
                        className={cn(
                            'inline-flex h-11 items-center rounded-full bg-stone-900 px-6 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900',
                            FOCUS_RING,
                        )}
                    >
                        Sign in
                    </Link>
                ) : null}
                <Link
                    href="/h"
                    className={cn(
                        'font-medium underline underline-offset-4 transition-colors duration-150 hover:text-lp-muted',
                        FOCUS_RING,
                    )}
                >
                    Browse public pages
                </Link>
            </div>
        </div>
    );
}