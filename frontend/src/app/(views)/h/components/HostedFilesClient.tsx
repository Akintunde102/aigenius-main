"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiUser, FiCalendar, FiFileText, FiSearch, FiLoader, FiTrash2, FiPlus } from 'react-icons/fi';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deleteHostedFile, getMyHostedFiles, publishHostedFileById, type HostedFilePublic } from '@/lib/calls/hosted-file';
import { listCodeProjects, type CodeProject } from '@/lib/calls/code-projects';
import { DISPLAY } from '@/app/components/landing/typography';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';
import { buildHostedFileDescription, estimateHostedReadingMinutes, hostedFileAuthorName } from '../hostedFileSeo.utils';
import { PublishMarkdownModal, AuthPromptModal } from './PublishMarkdownModal';

interface HostedFilesClientProps {
    files: HostedFilePublic[];
}

const CARD =
    'rounded-2xl bg-black/[0.04] transition-colors duration-200 dark:bg-white/[0.05]';
const CARD_HOVER = 'hover:bg-black/[0.07] dark:hover:bg-white/[0.08]';
const ROUND_BUTTON =
    'inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-lp-muted transition-colors duration-150 hover:text-rose-500 disabled:opacity-60 dark:bg-white/[0.07]';
const PRIMARY_PILL =
    'inline-flex h-9 items-center rounded-full bg-stone-900 px-4 text-sm font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] disabled:opacity-60 dark:bg-white dark:text-stone-900';

export default function HostedFilesClient({ files }: HostedFilesClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<{ id?: string } | null>(null);
    const [mine, setMine] = useState<HostedFilePublic[]>([]);
    const [projects, setProjects] = useState<CodeProject[]>([]);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [items, setItems] = useState<HostedFilePublic[]>(files || []);
    const [publishModalOpen, setPublishModalOpen] = useState(false);
    const [authPromptOpen, setAuthPromptOpen] = useState(false);

    useEffect(() => {
        setItems(files || []);
    }, [files]);

    useEffect(() => {
        const user = getStoredUserDetailsSnapshot();
        setCurrentUser(user);
        if (!user) return;
        void getMyHostedFiles()
            .then((rows) => setMine(Array.isArray(rows) ? rows : []))
            .catch(() => setMine([]));
        void listCodeProjects()
            .then((rows) => setProjects(Array.isArray(rows) ? rows : []))
            .catch(() => setProjects([]));
    }, []);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return items.filter((file) =>
            (file.title || '').toLowerCase().includes(term) ||
            (file.description || '').toLowerCase().includes(term) ||
            hostedFileAuthorName(file.user).toLowerCase().includes(term),
        );
    }, [items, searchTerm]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handlePublish = async (id: string) => {
        try {
            setPublishingId(id);
            const published = await publishHostedFileById(id);
            const next = { ...published, isPublished: true };
            setMine((prev) => prev.map((file) => (file.id === id ? { ...file, ...next } : file)));
            if (next.visibility !== 'restricted') {
                setItems((prev) => {
                    if (prev.some((file) => file.id === id)) {
                        return prev.map((file) => (file.id === id ? { ...file, ...next } : file));
                    }
                    return [next, ...prev];
                });
            }
        } catch (err) {
            console.error('Error publishing hosted page:', err);
            alert('Failed to publish this page. Please try again.');
        } finally {
            setPublishingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this hosted page? The public link will stop working.')) {
            return;
        }
        try {
            setDeletingId(id);
            await deleteHostedFile(id);
            setItems((prev) => prev.filter((file) => file.id !== id));
            setMine((prev) => prev.filter((file) => file.id !== id));
        } catch (err) {
            console.error('Error deleting hosted page:', err);
            alert('Failed to delete this page. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const handlePublishClick = () => {
        if (currentUser) {
            setPublishModalOpen(true);
        } else {
            setAuthPromptOpen(true);
        }
    };

    const handlePublishedSuccess = (newFile: HostedFilePublic) => {
        setMine((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
        if (newFile.isPublished && newFile.visibility !== 'restricted') {
            setItems((prev) => [newFile, ...prev.filter((f) => f.id !== newFile.id)]);
        }
    };

    const signInHref = `/login?next=${encodeURIComponent('/h')}`;
    const registerHref = `/signup?next=${encodeURIComponent('/h')}`;

    return (
        <section className="w-full pb-24 text-lp-fg">
            <div className="mx-auto w-full max-w-6xl px-5 pt-14 sm:px-8 lg:pt-24">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                    <header className="max-w-2xl">
                        <h1 className={`${DISPLAY} text-balance text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-6xl`}>
                            Hosted Markdown
                        </h1>
                        <p className="mt-5 max-w-xl text-lg leading-relaxed text-lp-muted">
                            Public notes and guides published from AIGenius. Read freely, or publish your own Markdown documents.
                        </p>
                    </header>
                    <div className="flex flex-wrap items-center gap-2.5 sm:pt-2">
                        <button
                            type="button"
                            onClick={handlePublishClick}
                            className={cn(PRIMARY_PILL, FOCUS_RING, '!h-10 !px-5 gap-1.5')}
                        >
                            <FiPlus size={16} aria-hidden />
                            <span>Publish Markdown</span>
                        </button>
                    </div>
                </div>

                {/* Publish Markdown Callout Banner */}
                <div className="mt-8 rounded-2xl border border-black/[0.08] bg-black/[0.02] p-5 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-xl">
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--chat-accent,#2563eb)]">
                                <FiFileText size={14} aria-hidden />
                                <span>Publish your Markdown</span>
                            </div>
                            <h2 className="mt-1.5 text-lg font-medium text-lp-fg sm:text-xl">
                                Share documentation, technical notes, or guides
                            </h2>
                            <p className="mt-1 text-sm leading-relaxed text-lp-muted">
                                Publish fast, responsive web pages directly from your Markdown notes with custom URLs, instant previews, and public or restricted access.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                            {currentUser ? (
                                <button
                                    type="button"
                                    onClick={() => setPublishModalOpen(true)}
                                    className={cn(PRIMARY_PILL, FOCUS_RING, '!h-10 !px-5 gap-1.5')}
                                >
                                    <FiPlus size={16} aria-hidden />
                                    <span>Publish Markdown</span>
                                </button>
                            ) : (
                                <>
                                    <Link
                                        href={signInHref}
                                        className={cn(PRIMARY_PILL, FOCUS_RING, '!h-10 !px-5')}
                                    >
                                        Log in to publish
                                    </Link>
                                    <Link
                                        href={registerHref}
                                        className={cn(
                                            'inline-flex h-10 items-center rounded-full bg-black/[0.06] px-5 text-sm font-medium text-lp-fg transition-colors duration-150 hover:bg-black/[0.1] active:scale-[0.97] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]',
                                            FOCUS_RING
                                        )}
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative mt-10 max-w-md">
                    <label htmlFor="search-hosted-pages" className="sr-only">
                        Search hosted pages
                    </label>
                    <FiSearch
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lp-muted"
                        size={18}
                        aria-hidden
                    />
                    <input
                        id="search-hosted-pages"
                        type="search"
                        placeholder="Search pages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoComplete="off"
                        className={cn(
                            'w-full rounded-full bg-black/[0.05] py-3 pl-11 pr-4 text-sm text-lp-fg placeholder:text-black/40 dark:bg-white/[0.07] dark:placeholder:text-white/40',
                            FOCUS_RING,
                        )}
                    />
                </div>

                {mine.length > 0 ? (
                    <div className="mt-14">
                        <div className="mb-5 flex items-center justify-between">
                            <h2 className={`${DISPLAY} text-2xl font-normal tracking-[-0.02em]`}>Your pages</h2>
                            <button
                                type="button"
                                onClick={() => setPublishModalOpen(true)}
                                className={cn(
                                    'inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.06] px-4 text-xs font-medium text-lp-fg transition-colors duration-150 hover:bg-black/[0.1] active:scale-[0.97] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]',
                                    FOCUS_RING
                                )}
                            >
                                <FiPlus size={14} aria-hidden />
                                <span>New page</span>
                            </button>
                        </div>
                        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
                            {mine.map((file) => (
                                <li key={file.id}>
                                    <div className={cn('flex h-full flex-col p-6', CARD)}>
                                        <span className="mb-3 w-fit rounded-full bg-black/[0.06] px-2.5 py-0.5 text-xs text-lp-muted dark:bg-white/[0.08]">
                                            {file.isPublished ? (file.visibility === 'restricted' ? 'Restricted' : 'Published') : 'Draft'}
                                        </span>
                                        <Link
                                            href={`/h/${file.slug}`}
                                            className={cn(
                                                `${DISPLAY} line-clamp-2 text-[1.35rem] font-normal leading-[1.2] tracking-[-0.015em] transition-opacity duration-150 hover:opacity-70`,
                                                FOCUS_RING,
                                            )}
                                        >
                                            {file.title}
                                        </Link>
                                        {file.codeProjectId ? (
                                            <p className="mt-1 text-xs text-lp-muted">
                                                {projects.find((project) => project.id === file.codeProjectId)?.name || 'Linked project'}
                                            </p>
                                        ) : null}
                                        <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-lp-muted">
                                            {buildHostedFileDescription(file)}
                                        </p>
                                        <div className="mt-6 flex flex-wrap items-center gap-2">
                                            {!file.isPublished ? (
                                                <button
                                                    type="button"
                                                    className={cn(PRIMARY_PILL, FOCUS_RING)}
                                                    disabled={publishingId === file.id}
                                                    onClick={() => void handlePublish(file.id)}
                                                >
                                                    {publishingId === file.id ? 'Publishing…' : 'Publish'}
                                                </button>
                                            ) : null}
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(file.id)}
                                                disabled={deletingId === file.id}
                                                aria-label="Delete hosted page"
                                                className={cn(ROUND_BUTTON, 'ml-auto', FOCUS_RING)}
                                            >
                                                {deletingId === file.id ? <FiLoader size={16} className="animate-spin" /> : <FiTrash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                <div className="mt-14">
                    {filtered.length === 0 ? (
                        <div className="mx-auto max-w-md py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]">
                                <FiFileText size={22} aria-hidden />
                            </div>
                            <h2 className={`${DISPLAY} mt-6 text-2xl font-normal tracking-[-0.02em]`}>
                                {searchTerm ? 'No pages found' : 'No hosted pages yet'}
                            </h2>
                            <p className="mt-3 text-[15px] leading-relaxed text-lp-muted">
                                {searchTerm
                                    ? 'Try a different search term.'
                                    : 'Upload or write a Markdown file and publish it as a public page.'}
                            </p>
                            {!searchTerm ? (
                                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                                    {currentUser ? (
                                        <button
                                            type="button"
                                            onClick={() => setPublishModalOpen(true)}
                                            className={cn(PRIMARY_PILL, FOCUS_RING, '!h-11 !px-6 gap-1.5')}
                                        >
                                            <FiPlus size={16} aria-hidden />
                                            <span>Publish your first page</span>
                                        </button>
                                    ) : (
                                        <>
                                            <Link
                                                href={signInHref}
                                                className={cn(PRIMARY_PILL, FOCUS_RING, '!h-11 !px-6')}
                                            >
                                                Log in to publish
                                            </Link>
                                            <Link
                                                href={registerHref}
                                                className={cn(
                                                    'inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-sm font-medium text-lp-fg transition-colors duration-150 hover:bg-black/[0.1] active:scale-[0.97] dark:bg-white/[0.08] dark:text-white dark:hover:bg-white/[0.14]',
                                                    FOCUS_RING
                                                )}
                                            >
                                                Register
                                            </Link>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((file) => (
                                <li key={file.id}>
                                    <Link
                                        href={`/h/${file.slug}`}
                                        prefetch
                                        className={cn('group flex h-full flex-col p-6', CARD, CARD_HOVER, FOCUS_RING)}
                                    >
                                        <h2 className={`${DISPLAY} line-clamp-2 text-[1.35rem] font-normal leading-[1.2] tracking-[-0.015em]`}>
                                            {file.title}
                                        </h2>
                                        <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-lp-muted">
                                            {buildHostedFileDescription(file)}
                                        </p>
                                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-xs text-lp-muted">
                                            <span className="flex items-center gap-1.5">
                                                <FiUser size={13} aria-hidden />
                                                <span className="font-medium text-lp-fg">
                                                    {hostedFileAuthorName(file.user)}
                                                </span>
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span className="flex items-center gap-1.5">
                                                <FiFileText size={13} aria-hidden />
                                                {estimateHostedReadingMinutes(file.markdownContent || '')} min
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span className="flex items-center gap-1.5">
                                                <FiCalendar size={13} aria-hidden />
                                                <time dateTime={file.publishedAt}>{formatDate(file.publishedAt)}</time>
                                            </span>
                                        </div>
                                        {currentUser && file.userId === currentUser.id ? (
                                            <div className="mt-4 flex">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        void handleDelete(file.id);
                                                    }}
                                                    disabled={deletingId === file.id}
                                                    aria-label="Delete hosted page"
                                                    className={cn(ROUND_BUTTON, 'ml-auto', FOCUS_RING)}
                                                >
                                                    {deletingId === file.id ? (
                                                        <FiLoader size={16} className="animate-spin" />
                                                    ) : (
                                                        <FiTrash2 size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        ) : null}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <PublishMarkdownModal
                isOpen={publishModalOpen}
                onClose={() => setPublishModalOpen(false)}
                onSuccess={handlePublishedSuccess}
                projects={projects}
            />

            <AuthPromptModal
                isOpen={authPromptOpen}
                onClose={() => setAuthPromptOpen(false)}
            />
        </section>
    );
}