'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import copy from 'copy-to-clipboard';
import toast from 'react-hot-toast';
import {
    FiCheck,
    FiCode,
    FiCopy,
    FiDownload,
    FiEye,
    FiFileText,
    FiLoader,
    FiMessageSquare,
    FiUser,
    FiX,
    FiZap,
} from 'react-icons/fi';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import type { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import {
    buildConversationTranscriptContent,
    buildConversationTranscriptFilename,
    buildConversationTranscriptMessages,
    downloadTextFile,
    resolveConversationTranscriptMessages,
    type ResolveConversationTranscriptMessagesOptions,
    type TranscriptFormat,
} from '@/lib/utils/conversationTranscriptExport';

const FORMAT_OPTIONS: { value: TranscriptFormat; label: string; ext: string; hint: string }[] = [
    { value: 'txt', label: 'Plain text', ext: '.txt', hint: 'Text with speaker labels' },
    { value: 'md', label: 'Markdown', ext: '.md', hint: 'Headers, formatting & codeblocks' },
    { value: 'json', label: 'JSON', ext: '.json', hint: 'Structured JSON data' },
];

const MIME_BY_FORMAT: Record<TranscriptFormat, string> = {
    txt: 'text/plain;charset=utf-8',
    md: 'text/markdown;charset=utf-8',
    json: 'application/json;charset=utf-8',
};

export type ConversationTranscriptModalProps = {
    open: boolean;
    session: ChatSession | null;
    title: string;
    onClose: () => void;
    resolveOptions?: ResolveConversationTranscriptMessagesOptions;
};

/**
 * Lightweight, zero-dependency parser for formatted transcript view
 * handles headings, bold text, lists, and paragraphs cleanly.
 */
function FormattedMessageContent({ content }: { content: string }) {
    const blocks = useMemo(() => {
        return content.split(/\n\n+/).map((block) => block.trim()).filter(Boolean);
    }, [content]);

    return (
        <div className="space-y-3 select-text">
            {blocks.map((block, idx) => {
                if (block.startsWith('### ')) {
                    return (
                        <h4 key={idx} className="text-xs font-semibold text-zinc-100 tracking-tight mt-2">
                            {block.replace(/^###\s+/, '')}
                        </h4>
                    );
                }
                if (block.startsWith('## ')) {
                    return (
                        <h3 key={idx} className="text-sm font-semibold text-white tracking-tight mt-3 pb-1 border-b border-white/[0.06]">
                            {block.replace(/^##\s+/, '')}
                        </h3>
                    );
                }
                if (block.startsWith('# ')) {
                    return (
                        <h2 key={idx} className="text-base font-bold text-white tracking-tight mt-3">
                            {block.replace(/^#\s+/, '')}
                        </h2>
                    );
                }
                if (block.startsWith('- ') || block.startsWith('* ') || /^\d+\.\s/.test(block)) {
                    const lines = block.split('\n');
                    return (
                        <ul key={idx} className="space-y-1.5 pl-4 text-xs text-zinc-300 list-disc list-outside">
                            {lines.map((line, lIdx) => (
                                <li key={lIdx} className="leading-relaxed">
                                    {renderInlineMarkdown(line.replace(/^[-*]|\d+\.\s*/, '').trim())}
                                </li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <p key={idx} className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">
                        {renderInlineMarkdown(block)}
                    </p>
                );
            })}
        </div>
    );
}

function renderInlineMarkdown(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <strong key={i} className="font-semibold text-white">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return (
                <code key={i} className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-zinc-200">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return part;
    });
}

export function ConversationTranscriptModal({
    open,
    session,
    title,
    onClose,
    resolveOptions,
}: ConversationTranscriptModalProps) {
    const [mounted, setMounted] = useState(false);
    const [format, setFormat] = useState<TranscriptFormat>('txt');
    const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('raw');
    const [messages, setMessages] = useState<ChatMessage[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const sessionId = session?.id ?? null;
    const sessionRef = useRef(session);
    sessionRef.current = session;

    const getCachedMessagesRef = useRef(resolveOptions?.getCachedMessages);
    useEffect(() => {
        getCachedMessagesRef.current = resolveOptions?.getCachedMessages;
    }, [resolveOptions?.getCachedMessages]);

    useEffect(() => {
        setMounted(true);
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (open) return;
        setMessages(null);
        setLoadError(null);
        setLoading(false);
        setFormat('txt');
        setViewMode('raw');
        setCopied(false);
    }, [open]);

    useEffect(() => {
        if (!open || !sessionId) {
            return;
        }

        const activeSession = sessionRef.current;
        if (!activeSession?.id) {
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);
        setMessages(null);

        const currentGetCached = getCachedMessagesRef.current;
        const loadOptions = currentGetCached ? { getCachedMessages: currentGetCached } : undefined;

        void resolveConversationTranscriptMessages(activeSession, loadOptions)
            .then((resolved) => {
                if (cancelled) return;
                setMessages(resolved);
            })
            .catch((err) => {
                if (cancelled) return;
                setLoadError(err instanceof Error ? err.message : 'Could not load transcript');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, sessionId, retryKey]);

    const liveGetCachedMessages = resolveOptions?.getCachedMessages;
    useEffect(() => {
        if (!open || !sessionId || loading) return;
        const cached = liveGetCachedMessages?.(sessionId);
        if (cached && cached.length > 0) {
            setMessages((prev) => {
                if (!prev) return cached;
                if (cached.length !== prev.length || cached[cached.length - 1] !== prev[prev.length - 1]) {
                    return cached;
                }
                return prev;
            });
        }
    }, [open, sessionId, loading, liveGetCachedMessages]);

    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !copying && !downloading) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [open, onClose, copying, downloading]);

    const displayTitle = title.trim() || 'Untitled Chat';
    const exportedAt = useMemo(() => new Date(), [open, sessionId]);

    const exportableMessages = useMemo(() => {
        if (!messages) return [];
        return buildConversationTranscriptMessages(messages);
    }, [messages]);

    const exportableMessageCount = exportableMessages.length;

    const previewContent = useMemo(() => {
        if (!messages || exportableMessageCount === 0) return '';
        return buildConversationTranscriptContent(displayTitle, messages, format, exportedAt);
    }, [messages, displayTitle, format, exportedAt, exportableMessageCount]);

    const lines = useMemo(() => {
        if (!previewContent) return [];
        return previewContent.split('\n');
    }, [previewContent]);

    const filename = useMemo(() => {
        return buildConversationTranscriptFilename(displayTitle, format, session?.id, exportedAt);
    }, [displayTitle, format, session?.id, exportedAt]);

    const wordCount = useMemo(() => {
        if (!previewContent) return 0;
        return previewContent.trim().split(/\s+/).filter(Boolean).length;
    }, [previewContent]);

    const charCount = previewContent.length;

    const approxFileSize = useMemo(() => {
        const bytes = new Blob([previewContent]).size;
        if (bytes < 1024) return `${bytes} B`;
        return `${(bytes / 1024).toFixed(1)} KB`;
    }, [previewContent]);

    const isEmpty = !loading && messages != null && exportableMessageCount === 0;

    const handleCopy = useCallback(() => {
        if (!messages || !session || !previewContent) return;
        setCopying(true);
        try {
            const ok = copy(previewContent);
            if (ok) {
                setCopied(true);
                if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
                copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
                toast.success('Transcript copied to clipboard');
            } else {
                toast.error('Could not copy transcript. Check clipboard permissions.');
            }
        } finally {
            setCopying(false);
        }
    }, [messages, session, previewContent]);

    const handleDownload = useCallback(() => {
        if (!messages || !session || !previewContent) return;
        setDownloading(true);
        try {
            downloadTextFile(filename, previewContent, MIME_BY_FORMAT[format]);
            toast.success(`Downloaded ${filename}`);
        } catch {
            toast.error('Could not download transcript. Please try again.');
        } finally {
            setDownloading(false);
        }
    }, [messages, session, filename, previewContent, format]);

    if (!open || !session || !mounted) {
        return null;
    }

    const busy = loading || copying || downloading;

    const overlay = (
        <div
            className="app-modal-overlay fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6"
            role="presentation"
            onClick={(e) => {
                if (e.target === e.currentTarget && !busy) onClose();
            }}
        >
            <RenderErrorBoundary logLabel="[conversation-transcript-modal]">
                <div
                    className="app-modal-panel flex h-[min(90vh,760px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#121216] shadow-2xl"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Transcript: ${displayTitle}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                                <FiFileText size={16} />
                            </span>
                            <div className="min-w-0 flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-sm font-semibold tracking-tight text-white leading-none">
                                    Transcript
                                </h2>
                                <span className="text-zinc-600 text-xs select-none">•</span>
                                <span className="max-w-[200px] sm:max-w-xs truncate rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-zinc-300">
                                    {displayTitle}
                                </span>
                                {!loading && !loadError && !isEmpty && (
                                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-white/[0.05] bg-white/[0.03] px-2 py-0.5 text-[10.5px] font-medium text-zinc-400">
                                        {exportableMessageCount} messages
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Accessible hidden select for screen readers & automated test suites */}
                            <label htmlFor="transcript-format" className="sr-only">
                                Format
                            </label>
                            <select
                                id="transcript-format"
                                aria-label="Format"
                                className="sr-only"
                                value={format}
                                onChange={(e) => setFormat(e.target.value as TranscriptFormat)}
                                disabled={busy || Boolean(loadError)}
                            >
                                {FORMAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} ({opt.hint})
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                                onClick={onClose}
                                disabled={busy}
                                aria-label="Close"
                            >
                                <FiX size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Integrated Controls Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/[0.06] bg-black/25 px-6 py-2.5">
                        {/* Format Picker Segmented Pills */}
                        <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
                            {FORMAT_OPTIONS.map((opt) => {
                                const isActive = format === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setFormat(opt.value)}
                                        disabled={busy || Boolean(loadError)}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                            isActive
                                                ? 'bg-white/10 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        <span
                                            className={`rounded px-1 py-0.2 text-[10px] font-mono uppercase tracking-wider ${
                                                isActive
                                                    ? 'bg-white/15 text-zinc-200'
                                                    : 'text-zinc-500'
                                            }`}
                                        >
                                            {opt.ext}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* View Switcher & Action Buttons */}
                        <div className="flex items-center gap-2">
                            {/* View Switcher */}
                            {!loading && !loadError && !isEmpty && (
                                <div className="hidden sm:flex items-center gap-1 rounded-lg border border-white/[0.06] bg-black/30 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('raw')}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                            viewMode === 'raw'
                                                ? 'bg-white/10 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                        title="View raw export syntax with line numbers"
                                    >
                                        <FiCode size={13} />
                                        <span>Code</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('formatted')}
                                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                                            viewMode === 'formatted'
                                                ? 'bg-white/10 text-white shadow-sm'
                                                : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                        title="View formatted conversation layout"
                                    >
                                        <FiEye size={13} />
                                        <span>Formatted</span>
                                    </button>
                                </div>
                            )}

                            {/* Copy Action */}
                            <button
                                type="button"
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all active:scale-[0.98] ${
                                    copied
                                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                        : 'border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:border-white/20 hover:bg-white/[0.08]'
                                } disabled:cursor-not-allowed disabled:opacity-40`}
                                onClick={handleCopy}
                                disabled={busy || Boolean(loadError) || isEmpty}
                                aria-label={copied ? 'Copied' : 'Copy'}
                            >
                                {copying ? (
                                    <FiLoader className="animate-spin shrink-0" size={13} aria-hidden />
                                ) : copied ? (
                                    <FiCheck className="shrink-0 text-emerald-400" size={13} aria-hidden />
                                ) : (
                                    <FiCopy className="shrink-0 text-zinc-400" size={13} aria-hidden />
                                )}
                                <span>{copied ? 'Copied!' : 'Copy'}</span>
                            </button>

                            {/* Download Action */}
                            <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={handleDownload}
                                disabled={busy || Boolean(loadError) || isEmpty}
                                aria-label="Download"
                            >
                                {downloading ? (
                                    <FiLoader className="animate-spin shrink-0" size={13} aria-hidden />
                                ) : (
                                    <FiDownload className="shrink-0" size={13} aria-hidden />
                                )}
                                <span>Download</span>
                            </button>
                        </div>
                    </div>

                    {/* Main Preview Container */}
                    <div className="flex flex-1 min-h-0 flex-col p-5">
                        <div className="flex flex-1 min-h-0 flex-col rounded-xl border border-white/[0.06] bg-[#0a0a0d] overflow-hidden shadow-inner">
                            {/* Inner Code Surface Header Bar */}
                            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 py-2 text-[11px] font-mono text-zinc-500">
                                <span className="truncate text-zinc-400">{filename}</span>
                                {!loading && !loadError && !isEmpty && (
                                    <span className="shrink-0 text-[10px] text-zinc-500">
                                        ~{wordCount} words • {charCount} chars • {approxFileSize}
                                    </span>
                                )}
                            </div>

                            {/* Scrollable Preview Area */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 select-text">
                                {loading ? (
                                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-zinc-400">
                                        <FiLoader className="animate-spin text-blue-400" size={22} aria-hidden />
                                        <span className="text-xs">Loading transcript…</span>
                                    </div>
                                ) : loadError ? (
                                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center">
                                        <p role="alert" className="text-xs font-medium text-red-400">
                                            {loadError}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRetryKey((k) => k + 1)}
                                            className="app-modal-btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : isEmpty ? (
                                    <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 text-zinc-500">
                                        <FiFileText size={28} className="stroke-[1.5] text-zinc-600" />
                                        <p className="text-xs">This chat has no exportable messages yet.</p>
                                    </div>
                                ) : viewMode === 'formatted' ? (
                                    /* Formatted Chat Stream View */
                                    <div className="mx-auto max-w-3xl space-y-4">
                                        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-zinc-400 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FiMessageSquare className="text-blue-400" size={14} />
                                                <span className="font-semibold text-zinc-200">{displayTitle}</span>
                                            </div>
                                            <div className="text-[11px] text-zinc-500 font-mono">
                                                {exportedAt.toISOString()}
                                            </div>
                                        </div>
                                        {exportableMessages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`rounded-xl border p-4 text-xs transition-colors ${
                                                    msg.role === 'user'
                                                        ? 'border-blue-500/20 bg-blue-500/[0.04]'
                                                        : 'border-white/[0.06] bg-white/[0.02]'
                                                }`}
                                            >
                                                <div className="mb-2.5 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        {msg.role === 'user' ? (
                                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
                                                                <FiUser size={11} />
                                                            </span>
                                                        ) : (
                                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                                                                <FiZap size={11} />
                                                            </span>
                                                        )}
                                                        <span
                                                            className={`text-[11px] font-semibold uppercase tracking-wider ${
                                                                msg.role === 'user' ? 'text-sky-400' : 'text-emerald-400'
                                                            }`}
                                                        >
                                                            {msg.role === 'user' ? 'User' : 'Assistant'}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-zinc-600 font-mono">#{idx + 1}</span>
                                                </div>
                                                <FormattedMessageContent content={msg.content} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    /* Exact Raw Export View with Line Gutter */
                                    <div className="flex font-mono text-xs leading-relaxed">
                                        <div
                                            className="select-none pr-3.5 text-right font-mono text-[11px] leading-relaxed text-zinc-600/70 border-r border-white/[0.06] mr-4 shrink-0"
                                            aria-hidden="true"
                                        >
                                            {lines.map((_, i) => (
                                                <div key={i}>{i + 1}</div>
                                            ))}
                                        </div>
                                        <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-300">
                                            {previewContent}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Status & Quick Exit Footer */}
                    <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] bg-black/20 px-6 py-2.5 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-3">
                            <span>{charCount > 0 ? `${charCount} characters` : 'No content'}</span>
                            <span className="inline-block h-1 w-1 rounded-full bg-zinc-600" />
                            <span>UTF-8 encoding</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">
                                Press <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">Esc</kbd> to close
                            </span>
                        </div>
                    </div>
                </div>
            </RenderErrorBoundary>
        </div>
    );

    return createPortal(overlay, document.getElementById('modal-root') ?? document.body);
}
