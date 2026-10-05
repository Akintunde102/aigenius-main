"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FiUser, FiCalendar, FiMessageSquare, FiSearch, FiLoader, FiTrash2 } from 'react-icons/fi';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deletePublishedConversation, PublishedConversation } from '@/lib/calls/model-chat-conversation';
import { DISPLAY } from '@/app/components/landing/typography';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';
import { publishedMessageReadableText } from '../publishedConversationSeo.utils';

interface PublishedConversationsClientProps {
    conversations: PublishedConversation[];
}

const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
};

const EASE = [0.23, 1, 0.32, 1] as const;

export default function PublishedConversationsClient({ conversations }: PublishedConversationsClientProps) {
    const reduce = useReducedMotion();
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [items, setItems] = useState<PublishedConversation[]>(conversations || []);

    useEffect(() => {
        setItems(conversations || []);
    }, [conversations]);

    useEffect(() => {
        // Local snapshot only. Never call getUserDetails() here: authorized API + refresh
        // failure triggers global login redirect, which breaks this public route.
        setCurrentUser(getStoredUserDetailsSnapshot());
    }, []);

    const filteredConversations = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return items.filter(conv =>
            (conv.publishedTitle || '').toLowerCase().includes(term) ||
            (conv.publishedDescription || '').toLowerCase().includes(term) ||
            `${conv.user?.firstName || ''} ${conv.user?.lastName || ''}`.toLowerCase().includes(term)
        );
    }, [items, searchTerm]);

    const isOwner = (conversation: PublishedConversation) => {
        return currentUser && conversation.userId === currentUser.id;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: '2-digit',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getMessageCount = (conversation: PublishedConversation) => {
        return conversation.session?.messages?.length || 0;
    };

    const getConversationPreview = (conversation: PublishedConversation) => {
        const firstUserMessage = conversation.session?.messages?.find(msg => msg.role === 'user');
        const preview = firstUserMessage
            ? publishedMessageReadableText(firstUserMessage).split('\n').map((line) => line.trim()).find(Boolean) ?? ''
            : '';
        if (preview) {
            return preview.length > 150 ? `${preview.slice(0, 150)}...` : preview;
        }
        return 'No preview available';
    };

    const handleDelete = async (conversationId: string) => {
        if (!confirm('Are you sure you want to delete this published conversation? This action cannot be undone.')) {
            return;
        }

        try {
            setDeletingId(conversationId);
            await deletePublishedConversation(conversationId);
            setItems(prev => prev.filter(conv => conv.id !== conversationId));
        } catch (err) {
            console.error('Error deleting conversation:', err);
            alert('Failed to delete conversation. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="w-full pb-24">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={reduce ? undefined : container}
                className="mx-auto w-full max-w-6xl px-5 pt-14 sm:px-8 lg:pt-24"
            >
                {/* Header */}
                <motion.div
                    variants={reduce ? undefined : fadeUp}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="max-w-2xl"
                >
                    <h1 className={`${DISPLAY} text-balance text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-6xl`}>
                        Published conversations
                    </h1>
                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-lp-muted">
                        Discover and explore AI conversations shared by the community.
                    </p>
                </motion.div>

                {/* Search */}
                <motion.div
                    variants={reduce ? undefined : fadeUp}
                    transition={{ duration: 0.3, ease: EASE }}
                    className="relative mt-10 max-w-md"
                >
                    <label htmlFor="search-conversations" className="sr-only">
                        Search conversations
                    </label>
                    <FiSearch
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lp-muted"
                        size={18}
                        aria-hidden
                    />
                    <input
                        id="search-conversations"
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={cn(
                            'w-full rounded-full bg-black/[0.05] py-3 pl-11 pr-4 text-sm text-lp-fg transition-shadow duration-150 placeholder:text-black/40 dark:bg-white/[0.07] dark:placeholder:text-white/40',
                            FOCUS_RING,
                        )}
                    />
                </motion.div>

                {/* Content */}
                <div className="mt-12">
                    {filteredConversations.length === 0 ? (
                        <motion.div
                            variants={reduce ? undefined : fadeUp}
                            transition={{ duration: 0.3, ease: EASE }}
                            className="mx-auto max-w-md py-12 text-center"
                        >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]">
                                <FiMessageSquare size={22} aria-hidden />
                            </div>
                            <h2 className={`${DISPLAY} mt-6 text-2xl font-normal tracking-[-0.02em]`}>
                                {searchTerm ? 'No conversations found' : 'No published conversations yet'}
                            </h2>
                            <p className="mt-3 text-[15px] leading-relaxed text-lp-muted">
                                {searchTerm
                                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                                    : 'Be the first to publish a conversation and share your AI interactions with the community!'
                                }
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className={cn(
                                        'mt-6 inline-flex h-11 items-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900',
                                        FOCUS_RING,
                                    )}
                                >
                                    Clear search
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {filteredConversations.map((conversation, i) => (
                                <motion.div
                                    key={conversation.id}
                                    variants={reduce ? undefined : fadeUp}
                                    transition={{ duration: 0.3, ease: EASE, delay: Math.min(i, 6) * 0.04 }}
                                >
                                    <Link
                                        href={`/published-conversations/${conversation.id}`}
                                        prefetch
                                        className={cn(
                                            'group flex h-full flex-col rounded-2xl bg-black/[0.04] p-6 transition-colors duration-200 hover:bg-black/[0.07] dark:bg-white/[0.05] dark:hover:bg-white/[0.08]',
                                            FOCUS_RING,
                                        )}
                                    >
                                        <h3 className={`${DISPLAY} line-clamp-2 text-[1.35rem] font-normal leading-[1.2] tracking-[-0.015em]`}>
                                            {conversation.publishedTitle}
                                        </h3>

                                        {conversation.publishedDescription && (
                                            <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-lp-muted">
                                                {conversation.publishedDescription}
                                            </p>
                                        )}

                                        <p className="mt-4 line-clamp-3 text-[13px] leading-relaxed text-lp-muted">
                                            {getConversationPreview(conversation)}
                                        </p>

                                        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-6 text-xs text-lp-muted">
                                            <span className="flex items-center gap-1.5">
                                                <FiUser size={13} aria-hidden />
                                                <span className="font-medium text-lp-fg">
                                                    {`${conversation.user?.firstName || ''} ${conversation.user?.lastName || ''}`.trim() || 'Anonymous'}
                                                </span>
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span className="flex items-center gap-1.5">
                                                <FiMessageSquare size={13} aria-hidden />
                                                {getMessageCount(conversation)} messages
                                            </span>
                                            <span aria-hidden>·</span>
                                            <span className="flex items-center gap-1.5">
                                                <FiCalendar size={13} aria-hidden />
                                                {formatDate(conversation.publishedAt)}
                                            </span>
                                        </div>

                                        {isOwner(conversation) && (
                                            <div className="mt-4 flex">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDelete(conversation.id);
                                                    }}
                                                    disabled={deletingId === conversation.id}
                                                    aria-label="Delete conversation"
                                                    className={cn(
                                                        'ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-lp-muted transition-colors duration-150 hover:text-rose-500 disabled:opacity-60 dark:bg-white/[0.07]',
                                                        FOCUS_RING,
                                                    )}
                                                >
                                                    {deletingId === conversation.id ? (
                                                        <FiLoader size={16} className="animate-spin" />
                                                    ) : (
                                                        <FiTrash2 size={16} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}