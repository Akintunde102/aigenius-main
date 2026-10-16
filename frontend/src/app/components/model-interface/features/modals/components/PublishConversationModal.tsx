import React, { useState, useEffect } from 'react';
import { FiGlobe, FiLock, FiCopy, FiCheck, FiExternalLink } from 'react-icons/fi';
import {
    AppModal,
    AppModalBody,
    AppModalHeader,
    AppModalFooter,
} from '@/app/components/modals/AppModal';
import { ChatSession } from '@/app/components/model-interface/shared/types';
import {
    copyPublishedConversationUrl,
    openPublishedConversationUrl,
} from '../utils/publishedConversationLink.utils';
import { trackConversationPublished } from '@/lib/analytics/product-events';

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
            trackConversationPublished({
                conversationId,
                isRepublishing,
            });
        } catch (error) {
            console.error('Failed to publish conversation:', error);
        } finally {
            setIsPublishing(false);
        }
    };

    const displayedUrl = publishedUrl || existingUrl;

    const copyUrl = () => {
        void copyPublishedConversationUrl(displayedUrl).then((copied) => {
            if (!copied) {
                return;
            }
            setUrlCopied(true);
            setTimeout(() => setUrlCopied(false), 2000);
        });
    };

    const openUrl = () => {
        openPublishedConversationUrl(displayedUrl);
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

    return (
        <AppModal
            open={isOpen}
            onClose={handleClose}
            size="sm"
            closeOnOverlayClick={!isPublishing}
            closeOnEscape={!isPublishing}
            panelClassName="flex max-h-[92vh] flex-col overflow-hidden"
        >
            <AppModalHeader
                title={isRepublishing ? 'Republish Conversation' : 'Publish Conversation'}
                subtitle="Create a shareable public link for this chat"
                onClose={handleClose}
            />
            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <AppModalBody className="space-y-3 overflow-y-auto !py-3">
                    <div
                        className="flex items-start gap-2.5 rounded-lg border p-2.5 text-xs"
                        style={{
                            background: 'color-mix(in srgb, var(--chat-accent) 8%, var(--modal-bg))',
                            borderColor: 'color-mix(in srgb, var(--chat-accent) 25%, var(--modal-border))',
                        }}
                    >
                        <FiGlobe className="shrink-0 mt-0.5 text-[var(--chat-accent)]" size={14} />
                        <div className="flex-1 min-w-0" style={{ color: 'var(--modal-fg)' }}>
                            <p className="font-semibold">Public link notice</p>
                            <p className="mt-0.5 opacity-80 leading-relaxed text-[11px]" style={{ color: 'var(--modal-muted-fg)' }}>
                                Anyone with this link can view the conversation history and shared responses.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="pub-title" className="app-modal-field-label">
                            Title *
                        </label>
                        <input
                            type="text"
                            id="pub-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="app-modal-input"
                            placeholder="Enter a title for your conversation..."
                            required
                            disabled={isPublishing}
                        />
                    </div>

                    <div>
                        <label htmlFor="pub-description" className="app-modal-field-label">
                            Description (optional)
                        </label>
                        <textarea
                            id="pub-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="app-modal-input resize-none"
                            placeholder="Add a brief description of what this conversation is about..."
                            disabled={isPublishing}
                        />
                    </div>

                    {/* URL Display Section */}
                    {(isPublished || (isRepublishing && existingUrl)) && (
                        <div
                            className="rounded-lg border p-2.5 space-y-2 text-xs"
                            style={{
                                background: 'color-mix(in srgb, #10b981 8%, var(--modal-bg))',
                                borderColor: 'color-mix(in srgb, #10b981 25%, var(--modal-border))',
                            }}
                        >
                            <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#10b981' }}>
                                <FiGlobe size={13} />
                                <span>{isRepublishing ? 'Previously Published Link' : 'Published Link'}</span>
                            </div>
                            <div
                                className="flex items-center gap-1.5 rounded-md border p-1.5"
                                style={{
                                    background: 'var(--modal-bg)',
                                    borderColor: 'var(--modal-border)',
                                }}
                            >
                                <input
                                    type="text"
                                    value={displayedUrl}
                                    readOnly
                                    title={displayedUrl}
                                    className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none font-mono"
                                    style={{ color: 'var(--modal-fg)' }}
                                />
                                <button
                                    type="button"
                                    onClick={copyUrl}
                                    className="app-modal-btn-secondary !px-2 !py-1 !text-[11px]"
                                >
                                    {urlCopied ? <FiCheck size={11} className="text-green-500" /> : <FiCopy size={11} />}
                                    {urlCopied ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                    type="button"
                                    onClick={openUrl}
                                    className="app-modal-btn-primary !px-2 !py-1 !text-[11px]"
                                >
                                    <FiExternalLink size={11} />
                                    View
                                </button>
                            </div>
                        </div>
                    )}

                    <div
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                        style={{
                            background: 'var(--surface-muted)',
                            borderColor: 'var(--modal-border)',
                            color: 'var(--modal-muted-fg)',
                        }}
                    >
                        <FiLock size={13} className="shrink-0" />
                        <span>
                            Contains {session.messages.length} message{session.messages.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </AppModalBody>

                <AppModalFooter>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isPublishing}
                        className="app-modal-btn-secondary text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!title.trim() || isPublishing}
                        className="app-modal-btn-primary text-xs"
                    >
                        {isPublishing ? (
                            <>
                                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>{isRepublishing ? 'Republishing…' : 'Publishing…'}</span>
                            </>
                        ) : (
                            <>
                                <FiGlobe size={13} />
                                <span>{isRepublishing ? 'Republish' : 'Publish'}</span>
                            </>
                        )}
                    </button>
                </AppModalFooter>
            </form>
        </AppModal>
    );
};
