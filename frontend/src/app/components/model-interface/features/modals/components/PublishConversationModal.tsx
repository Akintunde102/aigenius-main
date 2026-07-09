import React, { useState, useEffect } from 'react';
import { FiX, FiGlobe, FiLock, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';

interface PublishConversationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPublish: (title: string, description?: string) => Promise<string>; // Returns the conversation ID
    session: ChatSession;
    loading?: boolean;
    isRepublishing?: boolean;
    existingUrl?: string;
}

export const PublishConversationModal: React.FC<PublishConversationModalProps> = ({
    isOpen,
    onClose,
    onPublish,
    session,
    loading = false,
    isRepublishing = false,
    existingUrl = ''
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishedUrl, setPublishedUrl] = useState('');
    const [urlCopied, setUrlCopied] = useState(false);
    const [isPublished, setIsPublished] = useState(false);

    // Initialize form data
    useEffect(() => {
        if (isOpen) {
            if (isRepublishing && existingUrl) {
                setPublishedUrl(existingUrl);
                setIsPublished(true);
            } else {
                setIsPublished(false);
                setPublishedUrl('');
            }

            // Set default title from session title or first message
            if (!title) {
                if (session.title && session.title !== 'New Chat') {
                    setTitle(session.title);
                } else if (session.messages.length > 0) {
                    const firstUserMessage = session.messages.find(msg => msg.role === 'user');
                    if (firstUserMessage && typeof firstUserMessage.content === 'string') {
                        const content = firstUserMessage.content.trim();
                        const defaultTitle = content.length > 50
                            ? content.substring(0, 47) + '...'
                            : content;
                        setTitle(defaultTitle);
                    }
                }
            }
        }
    }, [isOpen, session, title, isRepublishing, existingUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsPublishing(true);
        try {
            const conversationId = await onPublish(title.trim(), description.trim() || undefined);
            const url = `${window.location.origin}/published-conversations/${conversationId}`;
            setPublishedUrl(url);
            setIsPublished(true);
        } catch (error) {
            console.error('Failed to publish conversation:', error);
        } finally {
            setIsPublishing(false);
        }
    };

    const copyUrl = async () => {
        try {
            await navigator.clipboard.writeText(publishedUrl);
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy URL:', error);
        }
    };

    const openUrl = () => {
        window.open(publishedUrl, '_blank');
    };

    const handleClose = () => {
        if (!isPublishing) {
            onClose();
            if (!isRepublishing) {
                setTitle('');
                setDescription('');
            }
            setIsPublished(false);
            setPublishedUrl('');
            setUrlCopied(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div
                className="rounded-lg shadow-xl max-w-md w-full max-h-[95vh] overflow-y-auto border flex flex-col"
                style={{
                    background: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                }}
            >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <div className="flex items-center gap-2">
                        <FiGlobe className="text-blue-500" size={20} />
                        <h2 className="text-lg font-semibold">
                            {isRepublishing ? 'Republish Conversation' : 'Publish Conversation'}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isPublishing}
                        className="hover:text-red-500 disabled:opacity-50 transition-colors"
                        style={{ color: "var(--modal-muted-fg)" }}
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4">
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <FiGlobe className="text-blue-500 shrink-0" size={16} />
                            <div className="text-sm">
                                <strong>Publishing this conversation will make it publicly accessible.</strong>
                                <p className="opacity-80 mt-1">
                                    Anyone with the link will be able to view the entire conversation.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label htmlFor="title" className="block text-sm font-medium mb-2" style={{ color: "var(--modal-muted-fg)" }}>
                            Title *
                        </label>
                        <input
                            type="text"
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="app-modal-input w-full px-3 py-2 rounded-md focus:outline-none"
                            placeholder="Enter a title for your conversation..."
                            required
                            disabled={isPublishing}
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="description" className="block text-sm font-medium mb-2" style={{ color: "var(--modal-muted-fg)" }}>
                            Description (optional)
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="app-modal-input w-full px-3 py-2 rounded-md focus:outline-none resize-none"
                            placeholder="Add a brief description of what this conversation is about..."
                            disabled={isPublishing}
                        />
                    </div>

                    {/* URL Display Section */}
                    {(isPublished || (isRepublishing && existingUrl)) && (
                        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <FiGlobe className="text-green-500" size={14} />
                                <span className="text-sm font-medium">
                                    {isRepublishing ? 'Previously Published URL' : 'Published URL'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 p-2 rounded border" style={{ background: "var(--modal-bg-muted)", borderColor: "var(--modal-border)" }}>
                                <input
                                    type="text"
                                    value={publishedUrl || existingUrl}
                                    readOnly
                                    className="flex-1 text-sm bg-transparent border-none outline-none"
                                    style={{ color: "var(--modal-fg)" }}
                                />
                                <button
                                    type="button"
                                    onClick={copyUrl}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                >
                                    {urlCopied ? <FiCheck size={12} /> : <FiCopy size={12} />}
                                    {urlCopied ? 'Copied!' : 'Copy'}
                                </button>
                                <button
                                    type="button"
                                    onClick={openUrl}
                                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    <FiExternalLink size={12} />
                                    View
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mb-4 p-3 rounded-lg" style={{ background: "var(--modal-bg-muted)", color: "var(--modal-muted-fg)" }}>
                        <div className="flex items-center gap-2 text-sm">
                            <FiLock size={14} />
                            <span>
                                Conversation contains {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isPublishing}
                            className="flex-1 px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)", color: "var(--modal-muted-fg)" }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || isPublishing}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isPublishing ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    {isRepublishing ? 'Republishing...' : 'Publishing...'}
                                </>
                            ) : (
                                <>
                                    <FiGlobe size={16} />
                                    {isRepublishing ? 'Republish' : 'Publish'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
