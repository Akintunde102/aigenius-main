"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FiCheck,
    FiDownload,
    FiHome,
    FiLoader,
    FiLogIn,
    FiMoon,
    FiShare2,
    FiSun,
    FiTrash2,
} from 'react-icons/fi';
import copy from 'copy-to-clipboard';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deleteHostedFile, type HostedFilePublic } from '@/lib/calls/hosted-file';
import { applyColorMode, persistColorMode } from '@/lib/color-mode';
import { HostedMarkdownBody } from './HostedMarkdownBody';
import {
    estimateHostedReadingMinutes,
    hostedFileAuthorName,
    hostedFileDownloadName,
} from '../hostedFileSeo.utils';

interface HostedMarkdownDetailClientProps {
    file: HostedFilePublic;
}

const iconButtonClass = [
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm',
    'border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] text-[var(--app-ink-900)]',
    'hover:bg-[var(--surface-muted)]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]',
    'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

const textButtonClass = [
    'inline-flex h-10 items-center rounded-lg border px-4 text-sm',
    'border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] text-[var(--app-ink-900)]',
    'hover:bg-[var(--surface-muted)]',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]',
].join(' ');

export default function HostedMarkdownDetailClient({ file }: HostedMarkdownDetailClientProps) {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<{ id?: string; firstName?: string | null } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    const authorName = hostedFileAuthorName(file.user);
    const isOwner = Boolean(currentUser && file.userId === currentUser.id);
    const readingMinutes = estimateHostedReadingMinutes(file.markdownContent);
    const signInHref = `/login?next=${encodeURIComponent(`/h/${file.slug}`)}`;

    useEffect(() => {
        setCurrentUser(getStoredUserDetailsSnapshot());
        setResolvedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }, []);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleDelete = async () => {
        if (!currentUser) return;
        if (!confirm('Remove this hosted page? The public link will stop working.')) {
            return;
        }
        try {
            setDeleting(true);
            await deleteHostedFile(file.id);
            router.push('/h');
        } catch (err) {
            console.error('Error deleting hosted page:', err);
            alert('Failed to delete this page. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const sharePage = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: file.title,
                    text: file.description || file.title,
                    url,
                });
                return;
            }
        } catch (err) {
            if ((err as { name?: string })?.name === 'AbortError') return;
        }
        copy(url);
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1600);
    };

    const downloadMarkdown = () => {
        const blob = new Blob([file.markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = hostedFileDownloadName(file.title, file.slug);
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const toggleTheme = () => {
        const next = resolvedTheme === 'dark' ? 'light' : 'dark';
        persistColorMode(next);
        applyColorMode(next);
        setResolvedTheme(next);
    };

    return (
        <article className="published-thread min-h-[70vh] w-full bg-[var(--chat-canvas-bg)] text-[var(--app-ink-900)]">
            <header className="sticky top-0 z-30 overflow-visible border-b border-[var(--chat-composer-border)] bg-[var(--chat-canvas-bg)]/95 backdrop-blur-sm">
                <div className="mx-auto flex h-11 w-full max-w-[72ch] items-center gap-2 px-4 sm:px-6">
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={file.title}>
                        {file.title}
                    </p>
                    <p className="hidden shrink-0 whitespace-nowrap text-xs text-[var(--chat-muted-fg)] sm:block">
                        <span className="font-medium text-[var(--app-ink-900)]">{authorName}</span>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={file.publishedAt}>{formatDate(file.publishedAt)}</time>
                        <span aria-hidden="true"> · </span>
                        <span>{readingMinutes} min read</span>
                    </p>
                    <p className="sr-only">
                        {authorName}. Published {formatDate(file.publishedAt)}. {readingMinutes} minute read.
                    </p>
                    <div className="relative ml-auto flex shrink-0 items-center gap-1" role="toolbar" aria-label="Page actions">
                        <button
                            type="button"
                            className={iconButtonClass}
                            onClick={toggleTheme}
                            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {resolvedTheme === 'dark' ? <FiSun size={15} aria-hidden /> : <FiMoon size={15} aria-hidden />}
                        </button>
                        <button type="button" className={iconButtonClass} onClick={downloadMarkdown} aria-label="Download Markdown">
                            <FiDownload size={15} aria-hidden />
                        </button>
                        <button type="button" className={iconButtonClass} onClick={sharePage} aria-label="Share page">
                            {linkCopied ? <FiCheck size={15} aria-hidden /> : <FiShare2 size={15} aria-hidden />}
                        </button>
                        {!currentUser ? (
                            <Link href={signInHref} className={iconButtonClass} aria-label="Sign in">
                                <FiLogIn size={15} aria-hidden />
                            </Link>
                        ) : (
                            <Link href="/" className={iconButtonClass} aria-label="Open AIGenius">
                                <FiHome size={15} aria-hidden />
                            </Link>
                        )}
                        {isOwner ? (
                            <button
                                type="button"
                                className={iconButtonClass}
                                onClick={handleDelete}
                                disabled={deleting}
                                aria-label="Delete hosted page"
                            >
                                {deleting ? <FiLoader size={15} className="animate-spin" aria-hidden /> : <FiTrash2 size={15} aria-hidden />}
                            </button>
                        ) : null}
                    </div>
                    <span className="sr-only" aria-live="polite">{linkCopied ? 'Link copied' : ''}</span>
                </div>
            </header>

            <div className="mx-auto w-full max-w-[72ch] px-4 py-8 sm:px-6">
                {file.description ? (
                    <p className="sr-only">{file.description}</p>
                ) : null}

                <HostedMarkdownBody markdown={file.markdownContent} />

                <section
                    aria-label="Use AIGenius"
                    className="mt-12 rounded-2xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-5 py-6"
                >
                    {currentUser ? (
                        <>
                            <h2 className="text-lg font-semibold tracking-tight">Continue in AIGenius</h2>
                            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--app-ink-700)]">
                                Open your workspace to host Markdown, chat with every model, and publish more pages.
                            </p>
                            <div className="mt-4">
                                <Link
                                    href="/"
                                    className="inline-flex h-10 items-center rounded-lg bg-[var(--chat-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--chat-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]"
                                >
                                    Open app
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold tracking-tight">Publish your own page</h2>
                            <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--app-ink-700)]">
                                Sign in to host Markdown from your files, chat with every model, and share a public page of your own.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link
                                    href={signInHref}
                                    className="inline-flex h-10 items-center rounded-lg bg-[var(--chat-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--chat-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]"
                                >
                                    Sign in
                                </Link>
                                <Link href="/signup" className={textButtonClass}>
                                    Create an account
                                </Link>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </article>
    );
}
