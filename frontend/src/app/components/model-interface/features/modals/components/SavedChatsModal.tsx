import React, { useEffect, useMemo, useState } from 'react';
import {
    FiTrash2,
    FiShare2,
    FiCopy,
    FiBookmark,
    FiChevronDown,
    FiCornerDownLeft,
} from 'react-icons/fi';
import {
    AppModal,
    AppModalBody,
    AppModalHeader,
    AppModalSearchRow,
} from '@/app/components/modals/AppModal';
import copy from 'copy-to-clipboard';
import toast from 'react-hot-toast';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { formatTime } from '@/lib/utils/modelInterfaceUtils';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { useMessageContent } from '../../messages/hooks';
import { ImageMessage, StructuredMessage } from '../../message-types';
import { ImagePreviewLightbox } from '../../message-types/components/ImagePreviewLightbox';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';

function getMessageExcerpt(msg: ChatMessage, maxLen = 280): string {
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
    const oneLine = text.replace(/\s+/g, ' ').trim();
    return oneLine.length > maxLen ? oneLine.slice(0, maxLen) + '…' : oneLine;
}

function getShareableText(msg: ChatMessage): string {
    if (typeof msg.content === 'string') return msg.content;
    return JSON.stringify(msg.content);
}

async function shareContent(content: string) {
    if (typeof navigator !== 'undefined' && navigator.share) {
        try {
            await navigator.share({ text: content });
            return;
        } catch {
            /* user cancelled or unsupported */
        }
    }
    copy(content);
    toast.success('Copied to clipboard');
}

function SavedMessageItem({
    msg,
    idx,
    isExpanded,
    onExpand,
    onInsert,
    onDelete,
}: {
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
    const isUser = msg.role === 'user';

    const handleCopy = () => {
        if (messageContent.isImageMsg) {
            copy(messageContent.imageUrl);
            toast.success('Image link copied');
        } else if (messageContent.isFileMsg) {
            copy(messageContent.fileUrl);
            toast.success('File link copied');
        } else if (messageContent.isStructuredContent) {
            const textContent = messageContent.structuredContent
                .filter((block) => block.type === 'text' && textPartToPlainString(block.text).trim())
                .map((block) => textPartToPlainString(block.text))
                .join('\n');
            copy(textContent);
            toast.success('Copied to clipboard');
        } else {
            copy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
            toast.success('Copied to clipboard');
        }
    };

    const toggleExpand = () => onExpand(isExpanded ? null : idx);

    return (
        <>
            <li className="list-none">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={toggleExpand}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleExpand();
                        }
                    }}
                    className={`app-model-card group relative flex flex-col gap-2 rounded-xl border cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--chat-accent)_35%,transparent)] ${isExpanded ? 'app-model-card--selected' : ''}`}
                    style={{ padding: '12px 14px' }}
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-start gap-2.5 min-w-0 pr-1">
                        <div
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold uppercase tracking-wide"
                            style={{
                                background: isUser
                                    ? 'color-mix(in srgb, var(--chat-accent) 14%, var(--surface-muted))'
                                    : 'var(--surface-muted)',
                                color: isUser ? 'var(--chat-accent)' : 'var(--modal-muted-fg)',
                            }}
                            aria-hidden
                        >
                            {isUser ? 'You' : 'AI'}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="app-model-card__title truncate text-[13px] font-medium">
                                    {isUser ? 'Your message' : 'Assistant'}
                                </span>
                                <span
                                    className="shrink-0 text-[10px] tabular-nums"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                >
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                            {!isExpanded && (
                                <p
                                    className="mt-1 text-xs leading-relaxed line-clamp-2"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                >
                                    {excerpt}
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-0.5">
                            <div
                                className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    type="button"
                                    title="Share"
                                    className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    onClick={() => shareContent(getShareableText(msg))}
                                >
                                    <FiShare2 size={13} strokeWidth={2} />
                                </button>
                                <button
                                    type="button"
                                    title="Copy"
                                    className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    onClick={handleCopy}
                                >
                                    <FiCopy size={13} strokeWidth={2} />
                                </button>
                                <button
                                    type="button"
                                    title="Insert into chat"
                                    className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    onClick={() => onInsert(msg)}
                                >
                                    <FiCornerDownLeft size={13} strokeWidth={2} />
                                </button>
                                <button
                                    type="button"
                                    title="Remove from saved"
                                    className="h-7 w-7 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(msg.id ?? String(idx));
                                    }}
                                >
                                    <FiTrash2 size={13} strokeWidth={2} />
                                </button>
                            </div>
                            <FiChevronDown
                                size={16}
                                strokeWidth={2}
                                className={`shrink-0 ml-0.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                style={{ color: 'var(--modal-muted-fg)' }}
                                aria-hidden
                            />
                        </div>
                    </div>

                    {isExpanded && (
                        <div
                            className="mt-1 rounded-lg border p-3 text-sm max-h-[min(40vh,320px)] overflow-y-auto"
                            style={{
                                background: 'var(--modal-bg-muted)',
                                borderColor: 'var(--modal-border)',
                                color: 'var(--modal-fg)',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <RenderErrorBoundary logLabel="[saved-chats-modal]">
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
                                    <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(msg.content, null, 2)}</pre>
                                )}
                            </RenderErrorBoundary>
                        </div>
                    )}
                </div>
            </li>
            {imagePreview ? (
                <ImagePreviewLightbox imageUrl={imagePreview} onClose={() => setImagePreview(null)} />
            ) : null}
        </>
    );
}

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
    const { t } = useLanguage();
    const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setExpandedMsg(null);
            setSearch('');
        }
    }, [isOpen]);

    const filteredMessages = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = savedChats ?? [];
        const filtered = q
            ? list.filter((msg) => {
                  const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                  return content.toLowerCase().includes(q);
              })
            : list;
        return [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    }, [savedChats, search]);

    const headerSubtitle =
        filteredMessages.length > 0
            ? `${filteredMessages.length} saved ${filteredMessages.length === 1 ? 'message' : 'messages'}`
            : search.trim()
              ? 'No matches for your search'
              : 'Bookmark any message from chat to find it here';

    return (
        <AppModal open={isOpen} onClose={onClose} size="lg" ariaLabelledBy="saved-chats-modal-title">
            <AppModalHeader
                titleId="saved-chats-modal-title"
                title={t('modals.savedChatsTitle', 'Saved Messages')}
                subtitle={headerSubtitle}
                onClose={onClose}
            />
            <AppModalSearchRow
                value={search}
                onChange={setSearch}
                placeholder={t('modals.searchSavedMessages', 'Search saved messages...')}
                autoFocus
            />
            <AppModalBody className="!py-2">
                    {filteredMessages.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center"
                            style={{
                                borderColor: 'var(--modal-border)',
                                background: 'var(--modal-bg-muted)',
                            }}
                        >
                            <div
                                className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl"
                                style={{
                                    background: 'color-mix(in srgb, var(--chat-accent) 10%, var(--surface-muted))',
                                    color: 'var(--chat-accent)',
                                }}
                            >
                                <FiBookmark size={22} strokeWidth={1.75} />
                            </div>
                            <p className="text-sm font-medium" style={{ color: 'var(--modal-fg)' }}>
                                {search.trim()
                                    ? t('modals.noSavedMessages', 'No saved messages.')
                                    : t('modals.noSavedMessages', 'No saved messages.')}
                            </p>
                            <p className="mt-1 max-w-xs text-xs leading-relaxed" style={{ color: 'var(--modal-muted-fg)' }}>
                                {search.trim()
                                    ? 'Try a different search term.'
                                    : t('modals.saveMessageHint', 'Save a message to see it here!')}
                            </p>
                        </div>
                    ) : (
                        <ul className="flex flex-col gap-2">
                            {filteredMessages.map((msg: ChatMessage, idx: number) => (
                                <SavedMessageItem
                                    key={msg.id || `${msg.timestamp}-${idx}`}
                                    msg={msg}
                                    idx={idx}
                                    isExpanded={expandedMsg === idx}
                                    onExpand={setExpandedMsg}
                                    onInsert={onInsertSaved}
                                    onDelete={onRemoveSaved}
                                />
                            ))}
                        </ul>
                    )}
            </AppModalBody>
        </AppModal>
    );
}
