"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { FiUser, FiCalendar, FiMessageSquare, FiSearch, FiLoader, FiTrash2 } from 'react-icons/fi';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deletePublishedConversation, PublishedConversation } from '@/lib/calls/model-chat-conversation';
import { LandingAmbientBackground } from '@/app/components/ui';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';

interface PublishedConversationsClientProps {
    conversations: PublishedConversation[];
}

const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
};

const EASE = [0.22, 1, 0.36, 1] as const;

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
        // Local snapshot only — never call getUserDetails() here: authorized API + refresh
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
        if (firstUserMessage && typeof firstUserMessage.content === 'string') {
            return firstUserMessage.content.length > 150
                ? firstUserMessage.content.substring(0, 150) + '...'
                : firstUserMessage.content;
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
        <div className="relative w-full pb-16">
            <LandingAmbientBackground />

            <motion.div
                initial="hidden"
                animate="visible"
                variants={reduce ? undefined : container}
                className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
            >
                {/* Header */}
                <motion.div
                    variants={reduce ? undefined : fadeUp}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="mx-auto max-w-2xl text-center"
                >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400/80">
                        Community
                    </p>
                    <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Published conversations
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-400">
                        Discover and explore AI conversations shared by the community.
                    </p>
                </motion.div>

                {/* Search */}
                <motion.div
                    variants={reduce ? undefined : fadeUp}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="relative mx-auto mt-10 max-w-lg"
                >
                    <label htmlFor="search-conversations" className="sr-only">
                        Search conversations
                    </label>
                    <FiSearch
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                        size={18}
                        aria-hidden
                    />
                    <input
                        id="search-conversations"
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-zinc-100 placeholder-zinc-500 backdrop-blur transition focus:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                </motion.div>

                {/* Content */}
                <div className="mt-12">
                    {filteredConversations.length === 0 ? (
                        <motion.div
                            variants={reduce ? undefined : fadeUp}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="relative mx-auto max-w-md"
                        >
                            <div
                                aria-hidden
                                className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-cyan-500/[0.12] via-transparent to-emerald-500/[0.12] blur-2xl"
                            />
                            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-8 text-center shadow-2xl shadow-black/50 sm:p-10">
                                <div
                                    aria-hidden
                                    className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
                                />
                                <div className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/[0.08] text-cyan-300">
                                    <FiMessageSquare size={22} aria-hidden />
                                </div>
                                <h3 className="relative mt-6 text-xl font-semibold tracking-tight text-white">
                                    {searchTerm ? 'No conversations found' : 'No published conversations yet'}
                                </h3>
                                <p className="relative mt-3 text-sm leading-relaxed text-zinc-400">
                                    {searchTerm
                                        ? 'Try adjusting your search terms to find what you\'re looking for.'
                                        : 'Be the first to publish a conversation and share your AI interactions with the community!'
                                    }
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className={cn(
                                            'relative mt-6 inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.99]',
                                            FOCUS_RING,
                                        )}
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredConversations.map((conversation, i) => (
                                <motion.div
                                    key={conversation.id}
                                    variants={reduce ? undefined : fadeUp}
                                    transition={{ duration: 0.45, ease: EASE, delay: Math.min(i, 6) * 0.05 }}
                                >
                                    <Link
                                        href={`/published-conversations/${conversation.id}`}
                                        prefetch
                                        className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/60 backdrop-blur-sm transition-colors hover:border-cyan-400/30 hover:bg-zinc-950/80"
                                    >
                                        <div className="flex h-full flex-col p-5">
                                            <h3 className="mb-2 line-clamp-2 text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                                                {conversation.publishedTitle}
                                            </h3>

                                            {conversation.publishedDescription && (
                                                <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-400">
                                                    {conversation.publishedDescription}
                                                </p>
                                            )}

                                            <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5">
                                                <p className="line-clamp-3 text-[13px] leading-relaxed text-zinc-400">
                                                    {getConversationPreview(conversation)}
                                                </p>
                                            </div>

                                            <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1.5">
                                                    <FiUser size={13} aria-hidden />
                                                    <span className="font-medium text-zinc-300">
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
                                                <div className="mt-4 border-t border-white/[0.06] pt-4">
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDelete(conversation.id);
                                                        }}
                                                        disabled={deletingId === conversation.id}
                                                        aria-label="Delete conversation"
                                                        className={cn(
                                                            'ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-zinc-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-60',
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
                                        </div>
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
