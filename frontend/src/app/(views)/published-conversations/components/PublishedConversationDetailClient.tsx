"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiCalendar, FiArrowLeft, FiLoader, FiShare2, FiMessageSquare, FiTrash2, FiHome } from 'react-icons/fi';
import { deletePublishedConversation, PublishedConversation } from '@/lib/calls/model-chat-conversation';
import { getStoredUserDetailsSnapshot } from '@/lib/calls/get-logged-user-details';
import { ChatMessage as ChatMessageType, Model } from '@/app/components/model-interface/shared/types';
import { ChatMessage } from './';
import copy from 'copy-to-clipboard';
import Link from 'next/link';
import { PAGE_BG } from '@/app/components/public-page-shell.constants';

interface PublishedConversationDetailClientProps {
    conversation: PublishedConversation;
}

export default function PublishedConversationDetailClient({ conversation }: PublishedConversationDetailClientProps) {
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [deleting, setDeleting] = useState(false);

    // States for ChatMessage component functionality
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [savedChats, setSavedChats] = useState<ChatMessageType[]>([]);
    const [selectedModel, setSelectedModel] = useState<Model | null>(null);

    useEffect(() => {
        setCurrentUser(getStoredUserDetailsSnapshot());
    }, []);

    const handleDelete = async () => {
        if (!conversation || !currentUser) return;

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

    const isOwner = conversation && currentUser && conversation.userId === currentUser.id;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const copyMessage = async (content: string) => {
        try {
            copy(content);
        } catch (err) {
            console.error('Failed to copy message:', err);
        }
    };

    const shareConversation = async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: conversation?.publishedTitle,
                    text: conversation?.publishedDescription,
                    url: window.location.href,
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Failed to share:', err);
        }
    };


    const handleSaveMessage = (msg: ChatMessageType) => {
        setSavedChats(prev => [...prev, msg]);
    };

    const handleReplayMessage = (message: ChatMessageType, idx: number) => {
        // Not supported in published view
    };

    const handleImagePreview = (url: string) => {
        setImagePreview(url);
    };

    const formatCost = (cost: number, showNaira: boolean) => {
        if (showNaira) {
            return `₦${(cost * 1400).toFixed(2)}`;
        }
        return `$${cost.toFixed(4)}`;
    };

    const renderMessage = (message: ChatMessageType, index: number) => {
        return (
            <ChatMessage
                key={index}
                msg={message}
                idx={index}
                selectedModel={selectedModel}
                showCosts={true}
                onSave={handleSaveMessage}
                onCopy={copyMessage}
                onReplay={handleReplayMessage}
                onImagePreview={handleImagePreview}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                formatCost={formatCost}
                savedChats={savedChats}
                loading={false}
                streaming={false}
            />
        )
    };

    return (
        <div className="relative w-full min-h-[50vh] pb-10" style={{ backgroundColor: PAGE_BG }}>

            <div
                className="sticky top-0 z-30 border-b border-zinc-700 shadow-sm"
                style={{ backgroundColor: PAGE_BG }}
            >
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <Link
                            href="/"
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                        >
                            <FiHome size={20} />
                        </Link>
                        <button
                            onClick={() => router.push('/published-conversations')}
                            className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 hover:text-white transition-colors"
                        >
                            <FiArrowLeft size={20} />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white line-clamp-1 mb-0">
                                {conversation.publishedTitle}
                            </h1>
                        </div>
                        <button
                            aria-label="Share conversation"
                            onClick={shareConversation}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                            <FiShare2 size={18} />
                        </button>

                        {isOwner && (
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                aria-label="Delete conversation"
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-300 hover:text-red-400 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                                {deleting ? (
                                    <FiLoader size={18} className="animate-spin" />
                                ) : (
                                    <FiTrash2 size={18} />
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-300 mb-2 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <FiUser size={14} className="text-gray-300" />
                            <span className="font-medium text-white">{`${conversation.user?.firstName || ''} ${conversation.user?.lastName || ''}`.trim() || 'Anonymous'}</span>
                        </div>
                        <span className="text-gray-500">•</span>
                        <div className="flex items-center gap-2">
                            <FiCalendar size={14} className="text-gray-300" />
                            <span className="text-gray-300">{formatDate(conversation.publishedAt)}</span>
                        </div>
                        <span className="text-gray-500">•</span>
                        <div className="flex items-center gap-2">
                            <FiMessageSquare size={14} className="text-gray-300" />
                            <span className="text-gray-300">{conversation.session?.messages?.length || 0} messages</span>
                        </div>
                    </div>

                    {conversation.publishedDescription && (
                        <div className="p-3 bg-gray-700/50 rounded-xl border border-gray-600">
                            <p className="text-gray-200 leading-relaxed">
                                {conversation.publishedDescription}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
                {conversation.session?.messages && conversation.session.messages.length > 0 ? (
                    <div className="space-y-1">
                        {conversation.session.messages.map((message, index) => {
                            return renderMessage(message, index)
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FiMessageSquare className="text-gray-400" size={24} />
                        </div>
                        <div className="text-gray-400 text-lg">No messages in this conversation</div>
                    </div>
                )}
            </div>
        </div>
    );
}


