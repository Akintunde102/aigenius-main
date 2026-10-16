import React, { useEffect, useMemo, useState } from 'react';
import {
    FiTrash2,
    FiShare2,
    FiCopy,
    FiCheck,
    FiBookmark,
    FiChevronDown,
    FiCornerDownLeft,
    FiSearch,
    FiX,
    FiUser,
    FiZap,
} from 'react-icons/fi';
import {
    AppModal,
    AppModalHeader,
    AppModalSearchRow,
    AppModalBody,
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

type RoleFilter = 'all' | 'assistant' | 'user';

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

function FormattedExcerpt({ excerpt }: { excerpt: string }) {
    // Parse inline code blocks `code` and bold **bold**
    const parts = excerpt.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

    return (
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-600 dark:text-zinc-300 line-clamp-2">
            {parts.map((part, i) => {
                if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
                    return (
                        <code
                            key={i}
                            className="rounded border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.08] px-1 py-0.2 font-mono text-[11px] text-zinc-800 dark:text-zinc-200"
                        >
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    return (
                        <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {part.slice(2, -2)}
                        </strong>
                    );
                }
                return part;
            })}
        </p>
    );
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
    const [copied, setCopied] = useState(false);
    const isUser = msg.role === 'user';

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
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
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
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
                    className={`group relative flex flex-col rounded-xl border transition-all cursor-pointer p-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/20 ${
                        isExpanded
                            ? 'shadow-sm'
                            : 'hover:border-black/20 dark:hover:border-white/20 hover:bg-black/[0.01] dark:hover:bg-white/[0.02]'
                    }`}
                    style={{
                        borderColor: isExpanded ? 'var(--chat-accent)' : 'var(--modal-border)',
                        background: isExpanded ? 'var(--surface-muted)' : 'var(--modal-bg)',
                    }}
                    aria-expanded={isExpanded}
                >
                    <div className="flex items-start justify-between gap-3 min-w-0">
                        {/* Avatar & Role Meta */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold transition-colors"
                                style={{
                                    borderColor: 'var(--modal-border)',
                                    background: 'var(--surface-muted)',
                                    color: 'var(--modal-fg)',
                                }}
                                aria-hidden
                            >
                                {isUser ? <FiUser size={12} /> : <FiZap size={12} />}
                            </span>

                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span
                                    className={`text-xs font-semibold tracking-tight uppercase ${
                                        isUser
                                            ? 'text-sky-700 dark:text-sky-400'
                                            : 'text-emerald-700 dark:text-emerald-400'
                                    }`}
                                >
                                    {isUser ? 'You' : 'Assistant'}
                                </span>
                                <span className="text-zinc-300 dark:text-zinc-600 text-xs select-none">•</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>
                        </div>

                        {/* Quick Action Toolbar */}
                        <div
                            className="flex shrink-0 items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                title="Insert into chat"
                                aria-label="Insert into chat"
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                                onClick={() => onInsert(msg)}
                            >
                                <FiCornerDownLeft size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                title={copied ? 'Copied!' : 'Copy'}
                                aria-label="Copy"
                                className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors ${
                                    copied
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                        : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                }`}
                                onClick={handleCopy}
                            >
                                {copied ? <FiCheck size={13} className="text-emerald-500" /> : <FiCopy size={13} strokeWidth={2} />}
                            </button>
                            <button
                                type="button"
                                title="Share"
                                aria-label="Share"
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                onClick={() => shareContent(getShareableText(msg))}
                            >
                                <FiShare2 size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                title="Remove from saved"
                                aria-label="Remove from saved"
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(msg.id ?? String(idx));
                                }}
                            >
                                <FiTrash2 size={13} strokeWidth={2} />
                            </button>
                            <button
                                type="button"
                                onClick={toggleExpand}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors ml-0.5"
                            >
                                <FiChevronDown
                                    size={15}
                                    strokeWidth={2}
                                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Excerpt in Collapsed View */}
                    {!isExpanded && <FormattedExcerpt excerpt={excerpt} />}

                    {/* Full Content in Expanded View */}
                    {isExpanded && (
                        <div
                            className="mt-3 rounded-xl border border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/90 dark:bg-[#0c0c10] p-4 text-xs leading-relaxed max-h-[min(48vh,380px)] overflow-y-auto"
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
                                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                                        {JSON.stringify(msg.content, null, 2)}
                                    </pre>
                                )}
                            </RenderErrorBoundary>

                            {/* Expanded Quick Action Bar */}
                            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-2 flex-wrap text-xs">
                                <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                                    ID: {msg.id ?? `#${idx + 1}`}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onInsert(msg)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                                    >
                                        <FiCornerDownLeft size={12} />
                                        <span>Insert into composer</span>
                                    </button>
                                </div>
                            </div>
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
    savedChats = [],
    onInsertSaved,
    onRemoveSaved,
}: SavedChatsModalProps) {
    const { t } = useLanguage();
    const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

    useEffect(() => {
        if (!isOpen) {
            setExpandedMsg(null);
            setSearch('');
            setRoleFilter('all');
        }
    }, [isOpen]);

    const allChats = savedChats ?? [];

    const roleCounts = useMemo(() => {
        let assistant = 0;
        let user = 0;
        for (const msg of allChats) {
            if (msg.role === 'user') user++;
            else assistant++;
        }
        return { all: allChats.length, assistant, user };
    }, [allChats]);

    const filteredMessages = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = allChats;

        if (roleFilter === 'assistant') {
            list = list.filter((m) => m.role !== 'user');
        } else if (roleFilter === 'user') {
            list = list.filter((m) => m.role === 'user');
        }

        if (q) {
            list = list.filter((msg) => {
                const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                return content.toLowerCase().includes(q);
            });
        }

        return [...list].sort((a, b) => b.timestamp - a.timestamp);
    }, [allChats, search, roleFilter]);

    return (
        <AppModal
            open={isOpen}
            onClose={onClose}
            size="lg"
            className="z-[110]"
            ariaLabelledBy="saved-chats-modal-title"
        >
            <AppModalHeader
                titleId="saved-chats-modal-title"
                title={t('modals.savedChatsTitle', 'Saved Messages')}
                subtitle={t('modals.savedChatsSubtitle', 'Browse, search, and insert saved messages.')}
                onClose={onClose}
            />

            <AppModalSearchRow
                value={search}
                onChange={setSearch}
                placeholder={t('modals.searchSavedMessages', 'Search saved messages...')}
            />

            {/* Filter row */}
            <div
                className="border-b px-4 py-2 shrink-0 flex items-center justify-between gap-2 overflow-x-auto [scrollbar-width:none]"
                style={{ borderColor: 'var(--modal-border)', background: 'transparent' }}
            >
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setRoleFilter('all')}
                        aria-pressed={roleFilter === 'all'}
                        className={`app-filter-pill inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium whitespace-nowrap tabular-nums transition-colors ${
                            roleFilter === 'all' ? 'app-filter-pill--active' : ''
                        }`}
                    >
                        <span>All</span>
                        <span
                            className="text-[10px] font-semibold px-1 py-0.5 rounded-md leading-none"
                            style={{
                                background:
                                    roleFilter === 'all'
                                        ? 'color-mix(in srgb, currentColor 14%, transparent)'
                                        : 'color-mix(in srgb, var(--modal-fg) 7%, transparent)',
                                color: roleFilter === 'all' ? 'inherit' : 'var(--sidebar-muted-fg)',
                            }}
                        >
                            {roleCounts.all}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter('assistant')}
                        aria-pressed={roleFilter === 'assistant'}
                        className={`app-filter-pill inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium whitespace-nowrap tabular-nums transition-colors ${
                            roleFilter === 'assistant' ? 'app-filter-pill--active' : ''
                        }`}
                    >
                        <span>Assistant</span>
                        <span
                            className="text-[10px] font-semibold px-1 py-0.5 rounded-md leading-none"
                            style={{
                                background:
                                    roleFilter === 'assistant'
                                        ? 'color-mix(in srgb, currentColor 14%, transparent)'
                                        : 'color-mix(in srgb, var(--modal-fg) 7%, transparent)',
                                color: roleFilter === 'assistant' ? 'inherit' : 'var(--sidebar-muted-fg)',
                            }}
                        >
                            {roleCounts.assistant}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setRoleFilter('user')}
                        aria-pressed={roleFilter === 'user'}
                        className={`app-filter-pill inline-flex items-center gap-1.5 h-7 px-2.5 text-[11px] font-medium whitespace-nowrap tabular-nums transition-colors ${
                            roleFilter === 'user' ? 'app-filter-pill--active' : ''
                        }`}
                    >
                        <span>You</span>
                        <span
                            className="text-[10px] font-semibold px-1 py-0.5 rounded-md leading-none"
                            style={{
                                background:
                                    roleFilter === 'user'
                                        ? 'color-mix(in srgb, currentColor 14%, transparent)'
                                        : 'color-mix(in srgb, var(--modal-fg) 7%, transparent)',
                                color: roleFilter === 'user' ? 'inherit' : 'var(--sidebar-muted-fg)',
                            }}
                        >
                            {roleCounts.user}
                        </span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <AppModalBody className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                {filteredMessages.length === 0 ? (
                    <div
                        className="m-4 rounded-xl border border-dashed py-14 text-center text-xs"
                        style={{
                            borderColor: 'var(--modal-border)',
                            background: 'var(--surface-muted)',
                            color: 'var(--modal-muted-fg)',
                        }}
                    >
                        <p className="text-sm font-semibold" style={{ color: 'var(--modal-fg)' }}>
                            {search.trim()
                                ? 'No matching saved messages'
                                : t('modals.noSavedMessages', 'No saved messages.')}
                        </p>
                        <p className="mt-1 text-xs">
                            {search.trim()
                                ? 'Try searching with a different term or clear the active filter.'
                                : t('modals.saveMessageHint', 'Save a message to see it here!')}
                        </p>
                        {search.trim() && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="app-modal-btn-primary !text-xs !py-1.5 mt-3"
                            >
                                Clear search
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="flex flex-col gap-2.5" role="list">
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
