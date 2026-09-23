"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FiUser, FiCalendar, FiFileText, FiSearch, FiLoader, FiTrash2 } from 'react-icons/fi';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deleteHostedFile, getMyHostedFiles, publishHostedFileById, type HostedFilePublic } from '@/lib/calls/hosted-file';
import { listCodeProjects, type CodeProject } from '@/lib/calls/code-projects';
import { cn } from '@/lib/utils';
import { buildHostedFileDescription, estimateHostedReadingMinutes, hostedFileAuthorName } from '../hostedFileSeo.utils';

interface HostedFilesClientProps {
    files: HostedFilePublic[];
}

const focusRing =
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--pub-accent)]';

export default function HostedFilesClient({ files }: HostedFilesClientProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<{ id?: string } | null>(null);
    const [mine, setMine] = useState<HostedFilePublic[]>([]);
    const [projects, setProjects] = useState<CodeProject[]>([]);
    const [publishingId, setPublishingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [items, setItems] = useState<HostedFilePublic[]>(files || []);

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

    const signInHref = `/login?next=${encodeURIComponent('/h')}`;

    return (
        <section className="relative w-full bg-[var(--chat-canvas-bg)] pb-16 text-[var(--pub-text)]">
            <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
                <header className="mx-auto max-w-2xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--pub-accent)]">
                        Library
                    </p>
                    <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                        Hosted Markdown
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--pub-text-muted)]">
                        Public notes and guides published from AIGenius. Read freely, then sign in to host your own.
                    </p>
                </header>

                <div className="relative mx-auto mt-10 max-w-lg">
                    <label htmlFor="search-hosted-pages" className="sr-only">
                        Search hosted pages
                    </label>
                    <FiSearch
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pub-text-faint)]"
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
                            'w-full rounded-xl border border-[var(--pub-border)] bg-[var(--pub-surface)] py-3 pl-11 pr-4 text-sm text-[var(--pub-text)] placeholder:text-[var(--pub-text-faint)]',
                            focusRing,
                        )}
                    />
                </div>

                {mine.length > 0 ? (
                    <div className="mt-12">
                        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--pub-accent)]">
                            Your pages
                        </h2>
                        <ul className="grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
                            {mine.map((file) => (
                                <li key={file.id}>
                                    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-5 shadow-[var(--pub-card-shadow)]">
                                        <div className="mb-2 flex items-center gap-2">
                                            <span className="rounded-full border border-[var(--pub-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--pub-text-muted)]">
                                                {file.isPublished ? (file.visibility === 'restricted' ? 'Restricted' : 'Published') : 'Draft'}
                                            </span>
                                        </div>
                                        <Link href={`/h/${file.slug}`} className="line-clamp-2 text-lg font-semibold tracking-tight hover:text-[var(--pub-accent)]">
                                            {file.title}
                                        </Link>
                                        {file.codeProjectId ? (
                                            <p className="mt-1 text-xs text-[var(--pub-text-faint)]">
                                                {projects.find((project) => project.id === file.codeProjectId)?.name || 'Linked project'}
                                            </p>
                                        ) : null}
                                        <p className="mt-2 line-clamp-2 text-sm text-[var(--pub-text-muted)]">
                                            {buildHostedFileDescription(file)}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {!file.isPublished ? (
                                                <button
                                                    type="button"
                                                    className={cn(
                                                        'inline-flex h-9 items-center rounded-lg bg-[var(--chat-accent)] px-3 text-sm font-semibold text-white',
                                                        focusRing,
                                                    )}
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
                                                className={cn(
                                                    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--pub-border)] text-[var(--pub-text-muted)] hover:text-red-400',
                                                    focusRing,
                                                )}
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

                <div className="mt-12">
                    {filtered.length === 0 ? (
                        <div className="relative mx-auto max-w-md">
                            <div className="relative overflow-hidden rounded-2xl border border-[var(--pub-border)] bg-[var(--pub-surface)] p-8 text-center shadow-[var(--pub-card-shadow)] sm:p-10">
                                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--pub-border)] text-[var(--pub-accent)]">
                                    <FiFileText size={22} aria-hidden />
                                </div>
                                <h2 className="relative mt-6 text-xl font-semibold tracking-tight">
                                    {searchTerm ? 'No pages found' : 'No hosted pages yet'}
                                </h2>
                                <p className="relative mt-3 text-sm leading-relaxed text-[var(--pub-text-muted)]">
                                    {searchTerm
                                        ? 'Try a different search term.'
                                        : 'Upload a Markdown file in AIGenius and publish it as a public page.'}
                                </p>
                                {!searchTerm ? (
                                    <Link
                                        href={signInHref}
                                        className={cn(
                                            'mt-6 inline-flex h-10 items-center rounded-lg bg-[var(--chat-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--chat-accent-hover)]',
                                            focusRing,
                                        )}
                                    >
                                        Sign in to publish
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <ul className="grid list-none gap-4 p-0 md:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((file) => (
                                <li key={file.id}>
                                    <Link
                                        href={`/h/${file.slug}`}
                                        prefetch
                                        className={cn(
                                            'group relative block h-full overflow-hidden rounded-2xl border border-[var(--pub-border)] bg-[var(--pub-surface)] shadow-[var(--pub-card-shadow)] transition-colors hover:border-[var(--pub-border-hover)] hover:bg-[var(--pub-surface-hover)]',
                                            focusRing,
                                        )}
                                    >
                                        <div className="flex h-full flex-col p-5">
                                            <h2 className="mb-2 line-clamp-2 text-lg font-semibold tracking-tight group-hover:text-[var(--pub-accent)]">
                                                {file.title}
                                            </h2>
                                            <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-[var(--pub-text-muted)]">
                                                {buildHostedFileDescription(file)}
                                            </p>
                                            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--pub-text-faint)]">
                                                <span className="flex items-center gap-1.5">
                                                    <FiUser size={13} aria-hidden />
                                                    <span className="font-medium text-[var(--pub-text)]">
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
                                                <div className="mt-4 border-t border-[var(--pub-border)] pt-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            void handleDelete(file.id);
                                                        }}
                                                        disabled={deletingId === file.id}
                                                        aria-label="Delete hosted page"
                                                        className={cn(
                                                            'ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--pub-border)] text-[var(--pub-text-muted)] transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-60',
                                                            focusRing,
                                                        )}
                                                    >
                                                        {deletingId === file.id ? (
                                                            <FiLoader size={16} className="animate-spin" />
                                                        ) : (
                                                            <FiTrash2 size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}
