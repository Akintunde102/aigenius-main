import React, { useEffect, useState } from 'react';
import { FiX, FiTrash2, FiShare2, FiCopy, FiSearch } from 'react-icons/fi';
import copy from 'copy-to-clipboard';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { formatTime } from '@/lib/utils/modelInterfaceUtils';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { useMessageContent } from '../../messages/hooks';
import { ImageMessage, StructuredMessage } from '../../message-types';



// Helper to generate an excerpt for a message (no title)
function getMessageExcerpt(msg: ChatMessage, maxLen = 300): string {
    let text = '';
    if (typeof msg.content === 'string') {
        text = msg.content;
    } else if (Array.isArray(msg.content) && msg.content.length > 0) {
        const first = msg.content[0];
        if (first.type === 'image_url' && first.image_url?.url) {
            text = '[Image]';
        } else {
            const flat = textPartToPlainString(first);
            text = flat.trim() ? flat : JSON.stringify(first);
        }
    } else {
        text = '[Unknown]';
    }
    return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

// Helper for sharing message using Web Share API or fallback
function shareContent(content: string) {
    if (navigator.share) {
        navigator.share({
            text: content
        }).catch(() => { });
    } else {
        copy(content);
        alert('Message copied to clipboard. You can now paste it anywhere.');
    }
}

// Subcomponent: SavedMessageItem
function SavedMessageItem({ msg, idx, isExpanded, onExpand, onInsert, onDelete }: {
    msg: ChatMessage;
    idx: number;
    isExpanded: boolean;
    onExpand: (idx: number | null) => void;
    onInsert: (msg: ChatMessage) => void;
    onDelete: (id: string) => void;
}) {
    const excerpt = getMessageExcerpt(msg);
    const messageContent = useMessageContent(msg.content);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleCopy = () => {
        if (messageContent.isImageMsg) {
            copy(messageContent.imageUrl);
        } else if (messageContent.isFileMsg) {
            copy(messageContent.fileUrl);
        } else if (messageContent.isStructuredContent) {
            const textContent = messageContent.structuredContent
                .filter(block => block.type === 'text' && textPartToPlainString(block.text).trim())
                .map(block => textPartToPlainString(block.text))
                .join('\n');
            copy(textContent);
        } else {
            copy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
        }
    };

    return (
        <>
            <li
                key={msg.id || idx}
                className={`relative px-2 py-2 rounded-lg cursor-pointer border hover:bg-blue-50/5 dark:hover:bg-zinc-800/10 transition group`}
                onClick={() => onExpand(isExpanded ? null : idx)}
                style={{
                    background: "var(--modal-bg-muted)",
                    borderColor: "var(--modal-border)",
                }}
            >
                {/* Icons above, far right */}
                <div className="absolute top-2 right-2 flex flex-row gap-2 z-10" onClick={e => e.stopPropagation()}>
                    <button
                        className="p-1 text-blue-400 hover:text-blue-600"
                        onClick={() => shareContent(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content))}
                        title="Share message"
                    >
                        <FiShare2 size={14} />
                    </button>
                    <button
                        className="p-1 text-blue-400 hover:text-blue-600"
                        onClick={handleCopy}
                        title="Copy message"
                    >
                        <FiCopy size={14} />
                    </button>
                    <button
                        className="p-1 text-green-500 hover:text-green-700"
                        onClick={() => onInsert(msg)}
                        title="Insert to Chat"
                    >
                        <FiShare2 size={14} />
                    </button>
                    <button
                        className="p-1 text-red-400 hover:text-red-600"
                        onClick={e => { e.stopPropagation(); onDelete(msg.id ?? String(idx)); }}
                        title="Delete"
                    >
                        <FiTrash2 size={14} />
                    </button>
                </div>
                {/* Message preview and accordion */}
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs font-medium" style={{ color: "var(--modal-muted-fg)" }}>{msg.role === 'user' ? 'User' : 'Assistant'}</span>
                        <span className="text-[10px]" style={{ color: "var(--modal-muted-fg)", opacity: 0.8 }}>{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: "var(--modal-fg)", maxWidth: '90%' }}>{excerpt}</div>
                    {isExpanded && (
                        <div className="mt-2 p-2 rounded border text-sm" style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)", color: "var(--modal-fg)" }}>
                            {messageContent.isImageMsg ? (
                                <ImageMessage
                                    imageUrl={messageContent.imageUrl}
                                    onImagePreview={(url) => setImagePreview(url)}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                />
                            ) : messageContent.isStructuredContent ? (
                                <StructuredMessage
                                    content={messageContent.structuredContent}
                                    onImagePreview={(url) => setImagePreview(url)}
                                    imagePreview={imagePreview}
                                    setImagePreview={setImagePreview}
                                />
                            ) : typeof msg.content === 'string' ? (
                                <MarkdownRenderer content={msg.content} />
                            ) : (
                                <pre className="whitespace-pre-wrap">{JSON.stringify(msg.content, null, 2)}</pre>
                            )}
                        </div>
                    )}
                </div>
            </li>
        </>
    );
}



// Main Modal Component
interface SavedChatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    savedChats: ChatMessage[];
    onInsertSaved: (msg: ChatMessage) => void;
    onRemoveSaved: (id: string) => void;
}

export function SavedChatsModal({
    isOpen,
    onClose,
    savedChats,
    onInsertSaved,
    onRemoveSaved,
}: SavedChatsModalProps) {
    const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Filtered messages
    const filteredMessages = (savedChats || []).filter(msg => {
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return content.toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-40 transition-all duration-200" onClick={onClose}>
            <div
                className="rounded-2xl shadow-2xl p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto border relative animate-fadeIn flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{
                    background: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                }}
            >
                {/* Header with search only */}
                <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <div className="flex items-center flex-1">
                        <div className="relative w-full max-w-md">
                            <input
                                type="text"
                                className="app-modal-input pl-8 pr-3 py-2 rounded-full w-full text-sm focus:outline-none"
                                placeholder="Search saved messages..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                            <FiSearch className="absolute left-2.5 top-3" size={16} style={{ color: "var(--modal-muted-fg)" }} />
                        </div>
                    </div>
                    <button className="hover:text-red-500 transition-colors ml-4" onClick={onClose} aria-label="Close" style={{ color: "var(--modal-muted-fg)" }}>
                        <FiX size={24} />
                    </button>
                </div>
                {/* Messages content */}
                <div className="flex-1 overflow-y-auto px-2 py-4">
                    <ul className="space-y-2 px-2">
                        {filteredMessages.length === 0 ? (
                            <div className="text-center py-12 text-lg flex flex-col items-center" style={{ color: "var(--modal-muted-fg)" }}>
                                <span className="mb-2">No saved messages.</span>
                                <span className="text-sm">Save a message to see it here!</span>
                            </div>
                        ) : (
                            filteredMessages.sort((a, b) => b.timestamp - a.timestamp).map((msg: ChatMessage, idx: number) => (
                                <SavedMessageItem
                                    key={msg.id || idx}
                                    msg={msg}
                                    idx={idx}
                                    isExpanded={expandedMsg === idx}
                                    onExpand={setExpandedMsg}
                                    onInsert={onInsertSaved}
                                    onDelete={onRemoveSaved}
                                />
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
} 