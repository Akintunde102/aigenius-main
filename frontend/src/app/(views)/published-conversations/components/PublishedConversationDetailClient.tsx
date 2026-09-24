"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    FiCheck,
    FiDownload,
    FiHome,
    FiList,
    FiLoader,
    FiLogIn,
    FiMoon,
    FiShare2,
    FiSun,
    FiTrash2,
} from 'react-icons/fi';
import copy from 'copy-to-clipboard';
import { formatUsdCostAsCredits } from '@/lib/credits';
import { deletePublishedConversation, PublishedConversation } from '@/lib/calls/model-chat-conversation';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { ChatMessage as ChatMessageType } from '@/app/components/model-interface/shared/types';
import { applyColorMode, persistColorMode } from '@/lib/color-mode';
import { ChatMessage } from './';
import {
    buildPublishedConversationMarkdown,
    listPublishedConversationQuestions,
    publishedConversationAuthorName,
    publishedConversationDownloadName,
    publishedMessageAnchorId,
} from '../publishedConversationSeo.utils';

interface PublishedConversationDetailClientProps {
    conversation: PublishedConversation;
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

export default function PublishedConversationDetailClient({ conversation }: PublishedConversationDetailClientProps) {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<{ id?: string } | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
    const [jumpOpen, setJumpOpen] = useState(false);
    const jumpMenuRef = useRef<HTMLDivElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<ChatMessageType[]>([]);

    useEffect(() => {
        setCurrentUser(getStoredUserDetailsSnapshot());
        setResolvedTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    }, []);

    useEffect(() => {
        if (!jumpOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setJumpOpen(false);
        };
        const onPointer = (event: MouseEvent) => {
            if (!jumpMenuRef.current?.contains(event.target as Node)) {
                setJumpOpen(false);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
        };
    }, [jumpOpen]);

    const authorName = publishedConversationAuthorName(conversation.user);
    const messages = conversation.session?.messages ?? [];
    const questions = useMemo(
        () => (messages.length > 2 ? listPublishedConversationQuestions(messages) : []),
        [messages],
    );
    const isOwner = Boolean(currentUser && conversation.userId === currentUser.id);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const handleDelete = async () => {
        if (!currentUser) return;
        if (!confirm('Are you sure you want to delete this published conversation? This action cannot be undone.')) {
            return;
        }
        try {
            setDeleting(true);
            await deletePublishedConversation(conversation.id);
            router.push('/published-conversations');
        } catch (err) {
            console.error('Error deleting conversation:', err);
            alert('Failed to delete conversation. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const shareConversation = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({
                    title: conversation.publishedTitle,
                    text: conversation.publishedDescription,
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

    const downloadConversation = () => {
        const markdown = buildPublishedConversationMarkdown(conversation);
        const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = publishedConversationDownloadName(conversation.publishedTitle);
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
            <header className="sticky top-0 z-30 border-b border-[var(--chat-composer-border)] bg-[var(--chat-canvas-bg)]/95 backdrop-blur-sm">
                <div className="mx-auto flex h-11 w-full max-w-3xl items-center gap-2 px-4 sm:px-6">
                    <nav className="sr-only" aria-label="Breadcrumb">
                        <ol>
                            <li><Link href="/">AIGenius</Link></li>
                            <li><Link href="/published-conversations">Published</Link></li>
                            <li aria-current="page">{conversation.publishedTitle}</li>
                        </ol>
                    </nav>
                    <h1 className="min-w-0 flex-1 truncate text-sm font-semibold" title={conversation.publishedTitle}>
                        {conversation.publishedTitle}
                    </h1>
                    <p className="hidden shrink-0 whitespace-nowrap text-xs text-[var(--chat-muted-fg)] sm:block">
                        <span className="font-medium text-[var(--app-ink-900)]">{authorName}</span>
                        <span aria-hidden="true"> · </span>
                        <time dateTime={conversation.publishedAt}>{formatDate(conversation.publishedAt)}</time>
                        <span aria-hidden="true"> · </span>
                        <span>{messages.length} {messages.length === 1 ? 'message' : 'messages'}</span>
                    </p>
                    <p className="sr-only">
                        {authorName}. Published {formatDate(conversation.publishedAt)}. {messages.length} {messages.length === 1 ? 'message' : 'messages'}.
                    </p>
                    <div className="ml-auto flex shrink-0 items-center gap-1" role="toolbar" aria-label="Conversation actions">
                        {questions.length >= 2 ? (
                            <div className="relative" ref={jumpMenuRef}>
                                <button
                                    type="button"
                                    className={iconButtonClass}
                                    aria-label="Jump to a question"
                                    aria-expanded={jumpOpen}
                                    aria-haspopup="menu"
                                    onClick={() => setJumpOpen((open) => !open)}
                                >
                                    <FiList size={15} aria-hidden />
                                </button>
                                {jumpOpen ? (
                                    <nav
                                        aria-label="Questions in this conversation"
                                        className="absolute right-0 top-full z-40 mt-1 max-h-64 w-72 overflow-y-auto rounded-xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] p-2 shadow-lg"
                                    >
                                        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
                                            {questions.map((question) => (
                                                <li key={question.anchorId}>
                                                    <a
                                                        href={`#${question.anchorId}`}
                                                        className="block py-1 text-[var(--app-ink-900)] underline-offset-2 hover:underline"
                                                        onClick={() => setJumpOpen(false)}
                                                    >
                                                        {question.label}
                                                    </a>
                                                </li>
                                            ))}
                                        </ol>
                                    </nav>
                                ) : null}
                            </div>
                        ) : null}
                        <button
                            type="button"
                            className={iconButtonClass}
                            onClick={toggleTheme}
                            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {resolvedTheme === 'dark' ? <FiSun size={15} aria-hidden /> : <FiMoon size={15} aria-hidden />}
                        </button>
                        <button type="button" className={iconButtonClass} onClick={downloadConversation} aria-label="Download conversation as Markdown">
                            <FiDownload size={15} aria-hidden />
                        </button>
                        <button type="button" className={iconButtonClass} onClick={shareConversation} aria-label="Share conversation">
                            {linkCopied ? <FiCheck size={15} aria-hidden /> : <FiShare2 size={15} aria-hidden />}
                        </button>
                        {!currentUser ? (
                            <Link href="/login" className={iconButtonClass} aria-label="Sign in">
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
                                aria-label="Delete conversation"
                            >
                                {deleting ? <FiLoader size={15} className="animate-spin" aria-hidden /> : <FiTrash2 size={15} aria-hidden />}
                            </button>
                        ) : null}
                    </div>
                    <span className="sr-only" aria-live="polite">{linkCopied ? 'Link copied' : ''}</span>
                </div>
            </header>

            <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
                {conversation.publishedDescription ? (
                    <p className="sr-only">{conversation.publishedDescription}</p>
                ) : null}

                {messages.length > 0 ? (
                    <div className="flex flex-col gap-6">
                        {messages.map((message, index) => (
                            <div
                                key={message.id || message.messageId || index}
                                id={publishedMessageAnchorId(index)}
                                className="scroll-mt-14"
                            >
                                <ChatMessage
                                    msg={message}
                                    idx={index}
                                    selectedModel={null}
                                    showCosts={false}
                                    onSave={(saved) => setSavedChats((prev) => [...prev, saved])}
                                    onCopy={(content) => { copy(content); }}
                                    onReplay={() => undefined}
                                    onImagePreview={setImagePreview}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                    formatCost={(value) => formatUsdCostAsCredits(value)}
                                    savedChats={savedChats}
                                    loading={false}
                                    streaming={false}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="py-16 text-center text-[var(--chat-muted-fg)]">
                        No messages in this conversation.
                    </p>
                )}

                <section
                    aria-label="Use AIGenius"
                    className="mt-12 rounded-2xl border border-[var(--chat-composer-border)] bg-[var(--chat-composer-bg)] px-5 py-6"
                >
                    <h2 className="text-lg font-semibold tracking-tight">Continue in AIGenius</h2>
                    <p className="mt-2 max-w-[62ch] text-sm leading-6 text-[var(--app-ink-700)]">
                        Sign in to chat with the same models, bring your own files, and publish a conversation of your own.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                            href="/login"
                            className="inline-flex h-10 items-center rounded-lg bg-[var(--chat-accent)] px-4 text-sm font-semibold text-white hover:bg-[var(--chat-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chat-accent)]"
                        >
                            Sign in
                        </Link>
                        <Link
                            href="/signup"
                            className={textButtonClass}
                        >
                            Create an account
                        </Link>
                    </div>
                </section>
            </div>
        </article>
    );
}
