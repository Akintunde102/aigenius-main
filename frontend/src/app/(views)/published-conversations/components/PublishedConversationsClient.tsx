"use client";

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUser, FiCalendar, FiMessageSquare, FiSearch, FiLoader, FiTrash2, FiHome } from 'react-icons/fi';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { deletePublishedConversation, PublishedConversation } from '@/lib/calls/model-chat-conversation';

interface PublishedConversationsClientProps {
    conversations: PublishedConversation[];
}

export default function PublishedConversationsClient({ conversations }: PublishedConversationsClientProps) {
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
        <div className="relative w-full pb-12 text-[14px]">
            <div className="relative z-10">
                <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 shadow-lg transition-colors hover:bg-zinc-700"
                            aria-label="Home"
                        >
                            <FiHome className="text-white" size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1">Published Conversations</h1>
                            <p className="text-gray-300 text-lg">Discover and explore AI conversations shared by the community</p>
                        </div>
                    </div>

                    <div className="relative max-w-lg">
                        <label htmlFor="search-conversations" className="sr-only">
                            Search conversations
                        </label>
                        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            id="search-conversations"
                            type="text"
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-xl border border-zinc-600 bg-zinc-800/80 py-3 pl-12 pr-4 text-white shadow-sm placeholder-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                    </div>
                </div>
            </div>

            <div className="relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-600 rounded-3xl mx-auto mb-6" />
                            <h3 className="text-2xl font-semibold text-white mb-3">
                                {searchTerm ? 'No conversations found' : 'No published conversations yet'}
                            </h3>
                            <p className="text-gray-300 text-lg max-w-md mx-auto mb-6">
                                {searchTerm
                                    ? 'Try adjusting your search terms to find what you\'re looking for.'
                                    : 'Be the first to publish a conversation and share your AI interactions with the community!'
                                }
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="px-6 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 transition-colors font-medium"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {filteredConversations.map((conversation) => (
                                <Link
                                    key={conversation.id}
                                    href={`/published-conversations/${conversation.id}`}
                                    prefetch
                                    className="group relative block rounded-2xl border border-zinc-600 bg-zinc-900/60 shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/40 hover:shadow-lg"
                                >
                                    <div className="p-6">
                                        <h3 className="mb-3 line-clamp-2 text-xl font-semibold text-white transition-colors group-hover:text-cyan-300">
                                            {conversation.publishedTitle}
                                        </h3>

                                        {conversation.publishedDescription && (
                                            <p className="text-gray-300 text-sm mb-4 line-clamp-2 leading-relaxed">
                                                {conversation.publishedDescription}
                                            </p>
                                        )}

                                        <div className="bg-gray-700/50 rounded-xl p-4 mb-5 border border-gray-600">
                                            <p className="text-gray-200 text-sm line-clamp-3 leading-relaxed">
                                                {getConversationPreview(conversation)}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-300 text-sm mb-5">
                                            <div className="flex items-center gap-2">
                                                <FiUser size={14} className="text-gray-300" />
                                                <span className="font-medium text-white">{`${conversation.user?.firstName || ''} ${conversation.user?.lastName || ''}`.trim() || 'Anonymous'}</span>
                                            </div>
                                            <span className="text-gray-500">•</span>
                                            <div className="flex items-center gap-2">
                                                <FiMessageSquare size={14} className="text-gray-300" />
                                                <span className="text-gray-300">{getMessageCount(conversation)} messages</span>
                                            </div>
                                            <span className="text-gray-500">•</span>
                                            <div className="flex items-center gap-2">
                                                <FiCalendar size={14} className="text-gray-300" />
                                                <span className="text-gray-300">{formatDate(conversation.publishedAt)}</span>
                                            </div>
                                        </div>

                                        {isOwner(conversation) && (
                                            <div className="pt-4 border-t border-gray-600">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDelete(conversation.id);
                                                    }}
                                                    disabled={deletingId === conversation.id}
                                                    aria-label="Delete conversation"
                                                    className="w-10 h-10 ml-auto flex items-center justify-center text-gray-300 hover:text-red-400 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors disabled:opacity-60"
                                                >
                                                    {deletingId === conversation.id ? (
                                                        <FiLoader size={18} className="animate-spin" />
                                                    ) : (
                                                        <FiTrash2 size={18} />
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


