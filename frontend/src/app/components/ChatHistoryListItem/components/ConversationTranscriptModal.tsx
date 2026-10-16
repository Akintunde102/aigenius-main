'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import copy from 'copy-to-clipboard';
import toast from 'react-hot-toast';
import { FiCopy, FiDownload, FiLoader, FiX } from 'react-icons/fi';
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

const FORMAT_OPTIONS: { value: TranscriptFormat; label: string; hint: string }[] = [
    { value: 'txt', label: 'Plain text', hint: '.txt' },
    { value: 'md', label: 'Markdown', hint: '.md' },
    { value: 'json', label: 'JSON', hint: '.json' },
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

export function ConversationTranscriptModal({
    open,
    session,
    title,
    onClose,
    resolveOptions,
}: ConversationTranscriptModalProps) {
    const [mounted, setMounted] = useState(false);
    const [format, setFormat] = useState<TranscriptFormat>('txt');
    const [messages, setMessages] = useState<ChatMessage[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copying, setCopying] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const sessionId = session?.id ?? null;
    const sessionRef = useRef(session);
    sessionRef.current = session;

    const getCachedMessagesRef = useRef(resolveOptions?.getCachedMessages);
    useEffect(() => {
        getCachedMessagesRef.current = resolveOptions?.getCachedMessages;
    }, [resolveOptions?.getCachedMessages]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (open) return;
        setMessages(null);
        setLoadError(null);
        setLoading(false);
        setFormat('txt');
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
            if (e.key !== 'Escape' || copying || downloading) return;
            e.preventDefault();
            e.stopPropagation();
            onClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [open, onClose, copying, downloading]);

    const displayTitle = title.trim() || 'Untitled Chat';
    const exportedAt = useMemo(() => new Date(), [open, sessionId]);

    const exportableMessageCount = useMemo(() => {
        if (!messages) return null;
        return buildConversationTranscriptMessages(messages).length;
    }, [messages]);

    const previewContent = useMemo(() => {
        if (!messages || exportableMessageCount === 0) return '';
        return buildConversationTranscriptContent(displayTitle, messages, format, exportedAt);
    }, [messages, displayTitle, format, exportedAt, exportableMessageCount]);

    const isEmpty = !loading && messages != null && exportableMessageCount === 0;

    const handleCopy = useCallback(() => {
        if (!messages || !session) return;
        setCopying(true);
        try {
            const ok = copy(previewContent);
            if (ok) {
                toast.success('Transcript copied to clipboard');
            } else {
                toast.error('Could not copy transcript. Check clipboard permissions.');
            }
        } finally {
            setCopying(false);
        }
    }, [messages, session, previewContent]);

    const handleDownload = useCallback(() => {
        if (!messages || !session) return;
        setDownloading(true);
        try {
            const filename = buildConversationTranscriptFilename(
                displayTitle,
                format,
                session.id,
                exportedAt,
            );
            downloadTextFile(filename, previewContent, MIME_BY_FORMAT[format]);
        } catch {
            toast.error('Could not download transcript. Please try again.');
        } finally {
            setDownloading(false);
        }
    }, [messages, session, displayTitle, format, exportedAt, previewContent]);

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
                    className="app-modal-panel flex h-[min(88vh,720px)] w-full max-w-4xl flex-col overflow-hidden shadow-xl"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Transcript: ${displayTitle}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="app-modal-panel-header flex shrink-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold truncate" style={{ color: 'var(--modal-fg)' }}>
                                Transcript
                            </h2>
                            <p className="mt-0.5 text-xs truncate" style={{ color: 'var(--modal-muted-fg)' }}>
                                {displayTitle}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="app-modal-btn-secondary shrink-0 rounded-lg p-2"
                            onClick={onClose}
                            disabled={busy}
                            aria-label="Close"
                        >
                            <FiX size={16} aria-hidden />
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
                        <div
                            className="flex min-h-0 min-w-0 flex-1 flex-col border-b md:border-b-0 md:border-r"
                            style={{ borderColor: 'var(--modal-border)' }}
                        >
                            <div
                                className="shrink-0 px-4 py-2 text-[11px] font-medium uppercase tracking-wide"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            >
                                Preview
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                                {loading ? (
                                    <div
                                        className="flex items-center gap-2 py-8 text-sm"
                                        style={{ color: 'var(--modal-muted-fg)' }}
                                    >
                                        <FiLoader className="animate-spin shrink-0" aria-hidden />
                                        Loading transcript…
                                    </div>
                                ) : loadError ? (
                                    <div className="py-6 flex flex-col items-start gap-3">
                                        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                                            {loadError}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setRetryKey((k) => k + 1)}
                                            className="app-modal-btn-secondary px-3 py-1.5 text-xs font-medium rounded-md"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                ) : isEmpty ? (
                                    <p className="py-4 text-sm" style={{ color: 'var(--modal-muted-fg)' }}>
                                        This chat has no exportable messages yet.
                                    </p>
                                ) : (
                                    <pre
                                        className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed"
                                        style={{ color: 'var(--modal-fg)' }}
                                    >
                                        {previewContent}
                                    </pre>
                                )}
                            </div>
                        </div>

                        <aside
                            className="flex w-full shrink-0 flex-col gap-4 p-4 md:w-56 !bg-transparent"
                            style={{ background: 'transparent' }}
                            aria-label="Export options"
                        >
                            <div>
                                <label htmlFor="transcript-format" className="app-modal-field-label">
                                    Format
                                </label>
                                <select
                                    id="transcript-format"
                                    className="app-modal-input mt-1.5 w-full text-sm"
                                    value={format}
                                    onChange={(e) => setFormat(e.target.value as TranscriptFormat)}
                                    disabled={loading || Boolean(loadError)}
                                >
                                    {FORMAT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label} ({opt.hint})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    type="button"
                                    className="app-modal-btn-primary inline-flex items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={handleCopy}
                                    disabled={loading || Boolean(loadError) || isEmpty || copying}
                                >
                                    {copying ? (
                                        <FiLoader className="animate-spin shrink-0" aria-hidden />
                                    ) : (
                                        <FiCopy className="shrink-0" aria-hidden />
                                    )}
                                    Copy
                                </button>
                                <button
                                    type="button"
                                    className="app-modal-btn-secondary inline-flex items-center justify-center gap-2 px-3 py-2 text-sm"
                                    onClick={handleDownload}
                                    disabled={loading || Boolean(loadError) || isEmpty || downloading}
                                >
                                    {downloading ? (
                                        <FiLoader className="animate-spin shrink-0" aria-hidden />
                                    ) : (
                                        <FiDownload className="shrink-0" aria-hidden />
                                    )}
                                    Download
                                </button>
                            </div>
                        </aside>
                    </div>
                </div>
            </RenderErrorBoundary>
        </div>
    );

    return createPortal(overlay, document.getElementById('modal-root') ?? document.body);
}
