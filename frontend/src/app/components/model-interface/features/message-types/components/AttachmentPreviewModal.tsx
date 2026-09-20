'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import copy from 'copy-to-clipboard';
import {
    X,
    Download,
    ExternalLink,
    FileText,
    Music2,
    Video,
    Image as ImageIcon,
    Copy,
    Check,
    Loader2,
    FileCode,
    FileCheck,
    Globe,
} from 'lucide-react';
import {
    fileExtensionLabel,
    resolveAttachmentKind,
    type AttachmentKind,
} from './messageAttachment.utils';

export interface AttachmentPreviewTarget {
    fileUrl: string;
    fileName?: string;
    kind?: AttachmentKind;
    mimeType?: string;
}

export interface AttachmentPreviewModalProps {
    attachment: AttachmentPreviewTarget | string | null;
    onClose: () => void;
}

const TEXT_FILE_EXTENSIONS = [
    'txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx', 'html', 'css',
    'scss', 'xml', 'yaml', 'yml', 'py', 'sh', 'bash', 'c', 'cpp', 'java',
    'go', 'rs', 'php', 'rb', 'sql', 'log', 'ini', 'env', 'conf'
];

export function openRemoteUrlInNewTab(url: string, e?: React.MouseEvent): void {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (!url) return;
    try {
        const win = window.open(url, '_blank', 'noopener,noreferrer');
        if (!win || win.closed || typeof win.closed === 'undefined') {
            window.location.href = url;
        }
    } catch {
        window.location.href = url;
    }
}

export function triggerFileDownload(fileUrl: string, fileName: string): void {
    const defaultName = fileName || 'download';
    if (!fileUrl) return;

    if (fileUrl.startsWith('data:') || fileUrl.startsWith('blob:')) {
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
    }

    // Direct anchor download for remote HTTP/HTTPS URLs (avoids CSP connect-src fetch restrictions)
    const anchor = document.createElement('a');
    anchor.href = fileUrl;
    anchor.download = defaultName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

export function AttachmentPreviewModal({ attachment, onClose }: AttachmentPreviewModalProps) {
    const [mounted, setMounted] = useState(false);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState(false);
    const [textError, setTextError] = useState<string | null>(null);
    const [isCorsError, setIsCorsError] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const target: AttachmentPreviewTarget | null = useMemo(() => {
        if (!attachment) return null;
        if (typeof attachment === 'string') {
            const url = attachment;
            const name = url.split('/').pop()?.split('?')[0] || 'Attachment';
            return {
                fileUrl: url,
                fileName: decodeURIComponent(name),
                kind: resolveAttachmentKind(name, url),
            };
        }
        const name = attachment.fileName || attachment.fileUrl.split('/').pop()?.split('?')[0] || 'Attachment';
        return {
            ...attachment,
            fileName: name,
            kind: attachment.kind || resolveAttachmentKind(name, attachment.fileUrl),
        };
    }, [attachment]);

    const ext = useMemo(() => {
        if (!target?.fileName) return '';
        return fileExtensionLabel(target.fileName).toLowerCase();
    }, [target?.fileName]);

    const isTextLike = useMemo(() => {
        if (!target) return false;
        if (target.kind === 'image' || target.kind === 'audio') return false;
        if (TEXT_FILE_EXTENSIONS.includes(ext)) return true;
        if (target.mimeType?.startsWith('text/')) return true;
        if (target.fileUrl.startsWith('data:text/')) return true;
        return false;
    }, [target, ext]);

    const isVideo = useMemo(() => {
        if (!target) return false;
        return ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || target.mimeType?.startsWith('video/');
    }, [target, ext]);

    const isPdf = useMemo(() => ext === 'pdf' || target?.mimeType === 'application/pdf', [ext, target?.mimeType]);

    useEffect(() => {
        if (!target || !isTextLike) {
            setTextContent(null);
            setTextLoading(false);
            setTextError(null);
            setIsCorsError(false);
            return;
        }

        let isCancelled = false;

        if (target.fileUrl.startsWith('data:text/')) {
            try {
                const base64Parts = target.fileUrl.split(',');
                const decoded = atob(base64Parts[1] || '');
                setTextContent(decoded);
            } catch {
                setTextError('Failed to parse data URL content.');
            }
            return;
        }

        setTextLoading(true);
        setTextError(null);
        setIsCorsError(false);

        fetch(target.fileUrl, { mode: 'cors' })
            .then(async (res) => {
                if (isCancelled) return;
                if (!res.ok) {
                    throw new Error(`Server returned HTTP ${res.status}`);
                }
                const text = await res.text();
                if (!isCancelled) {
                    setTextContent(text);
                    setTextLoading(false);
                }
            })
            .catch((err) => {
                if (!isCancelled) {
                    setTextLoading(false);
                    const isCorsOrCsp = err instanceof TypeError || err.name === 'SecurityError' || err.message === 'Failed to fetch';
                    setIsCorsError(isCorsOrCsp);
                    setTextError(
                        isCorsOrCsp
                            ? 'Remote storage text preview is restricted by server security or origin policy.'
                            : (err.message || 'Unable to load text preview.')
                    );
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [target, isTextLike]);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        return () => window.removeEventListener('keydown', onKeyDown, true);
    }, [onClose]);

    const handleDownload = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!target?.fileUrl) return;
        triggerFileDownload(target.fileUrl, target.fileName || 'file');
    }, [target]);

    const handleOpenRemoteUrl = useCallback((e?: React.MouseEvent) => {
        if (!target?.fileUrl) return;
        openRemoteUrlInNewTab(target.fileUrl, e);
    }, [target]);

    const handleCopyText = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (!textContent) return;

        try {
            const success = copy(textContent);
            if (success) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
                return;
            }
        } catch {
            // Fall through to fallback below
        }

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(textContent)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = textContent;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    } catch {
                        // ignore
                    }
                    document.body.removeChild(textarea);
                });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = textContent;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch {
                // ignore
            }
            document.body.removeChild(textarea);
        }
    }, [textContent]);

    if (!mounted || typeof document === 'undefined' || !target) {
        return null;
    }

    const portalTarget = document.getElementById('modal-root') ?? document.body;

    return createPortal(
        (
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Preview ${target.fileName}`}
                className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
                style={{ background: "var(--modal-overlay)" }}
                onClick={onClose}
            >
                {/* Main Modal Shell matching Select Model modal architecture */}
                <div
                    className="flex h-full max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-200"
                    style={{
                        background: "var(--modal-bg)",
                        borderColor: "var(--modal-border)",
                        color: "var(--modal-fg)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div
                        className="flex flex-shrink-0 items-center justify-between border-b px-5 py-3.5"
                        style={{ borderColor: "var(--modal-border)" }}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                                {target.kind === 'image' ? (
                                    <ImageIcon size={20} />
                                ) : target.kind === 'audio' ? (
                                    <Music2 size={20} />
                                ) : isVideo ? (
                                    <Video size={20} />
                                ) : isTextLike ? (
                                    <FileCode size={20} />
                                ) : (
                                    <FileText size={20} />
                                )}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="truncate font-bold text-base sm:text-lg" title={target.fileName}>
                                        {target.fileName}
                                    </h2>
                                    {ext && (
                                        <span
                                            className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                                            style={{
                                                background: "var(--modal-bg-muted)",
                                                borderColor: "var(--modal-border)",
                                                color: "var(--modal-muted-fg)",
                                            }}
                                        >
                                            {ext}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                                    Attachment Preview
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                            {/* Primary Download button */}
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition active:scale-95"
                                title="Download attachment file"
                            >
                                <Download className="h-4 w-4" />
                                <span>Download</span>
                            </button>

                            {/* Open in new tab button */}
                            <button
                                type="button"
                                onClick={handleOpenRemoteUrl}
                                className="hidden sm:flex items-center justify-center rounded-xl border p-2 transition hover:opacity-80"
                                style={{
                                    background: "var(--modal-bg-muted)",
                                    borderColor: "var(--modal-border)",
                                    color: "var(--modal-muted-fg)",
                                }}
                                title="Open in new tab"
                                aria-label="Open in new tab"
                            >
                                <ExternalLink size={18} />
                            </button>

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex items-center justify-center rounded-xl border p-2 transition hover:text-red-500"
                                style={{
                                    background: "var(--modal-bg-muted)",
                                    borderColor: "var(--modal-border)",
                                    color: "var(--modal-muted-fg)",
                                }}
                                aria-label="Close preview"
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div
                        className="flex-1 overflow-hidden p-3 sm:p-5 flex flex-col justify-center items-center"
                        style={{ background: "var(--modal-bg-muted)" }}
                    >
                        {target.kind === 'image' ? (
                            <div
                                className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border p-2"
                                style={{
                                    background: "var(--modal-bg)",
                                    borderColor: "var(--modal-border)",
                                }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={target.fileUrl}
                                    alt={target.fileName || 'Preview'}
                                    className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                                    decoding="async"
                                />
                            </div>
                        ) : isTextLike ? (
                            <div
                                className="flex h-full w-full flex-col overflow-hidden rounded-xl border"
                                style={{
                                    background: "var(--modal-bg)",
                                    borderColor: "var(--modal-border)",
                                }}
                            >
                                <div
                                    className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-medium"
                                    style={{
                                        background: "var(--modal-bg-muted)",
                                        borderColor: "var(--modal-border)",
                                        color: "var(--modal-muted-fg)",
                                    }}
                                >
                                    <span>{textContent ? `${textContent.split('\n').length} lines · ${textContent.length} characters` : 'Text preview'}</span>
                                    {textContent && (
                                        <button
                                            type="button"
                                            onClick={handleCopyText}
                                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1 font-semibold transition hover:opacity-80"
                                            style={{
                                                background: "var(--modal-bg)",
                                                borderColor: "var(--modal-border)",
                                                color: "var(--modal-fg)",
                                            }}
                                        >
                                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                            <span>{copied ? 'Copied' : 'Copy Text'}</span>
                                        </button>
                                    )}
                                </div>
                                <div
                                    className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed selection:bg-blue-500/30"
                                    style={{ color: "var(--modal-fg)" }}
                                >
                                    {textLoading ? (
                                        <div className="flex h-full items-center justify-center gap-2" style={{ color: "var(--modal-muted-fg)" }}>
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                            <span>Loading text content...</span>
                                        </div>
                                    ) : textError ? (
                                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center max-w-md mx-auto">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 ring-4 ring-blue-500/20">
                                                {isCorsError ? <Globe size={28} /> : <FileText size={28} />}
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold" style={{ color: "var(--modal-fg)" }}>
                                                    {isCorsError ? 'Remote Storage File' : 'Preview Unavailable'}
                                                </h4>
                                                <p className="text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                                                    {textError}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2.5 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleDownload}
                                                    className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-95"
                                                >
                                                    <Download size={14} />
                                                    <span>Download File</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleOpenRemoteUrl}
                                                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition hover:opacity-80"
                                                    style={{
                                                        background: "var(--modal-bg-muted)",
                                                        borderColor: "var(--modal-border)",
                                                        color: "var(--modal-fg)",
                                                    }}
                                                >
                                                    <ExternalLink size={14} />
                                                    <span>Open Remote URL</span>
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <pre className="whitespace-pre-wrap break-words">{textContent}</pre>
                                    )}
                                </div>
                            </div>
                        ) : target.kind === 'audio' ? (
                            <div
                                className="flex flex-col items-center justify-center gap-6 p-8 text-center max-w-md w-full rounded-2xl border shadow-xl"
                                style={{
                                    background: "var(--modal-bg)",
                                    borderColor: "var(--modal-border)",
                                }}
                            >
                                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-blue-500 ring-4 ring-blue-500/20">
                                    <Music2 size={36} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold" style={{ color: "var(--modal-fg)" }}>{target.fileName}</h3>
                                    <p className="text-xs mt-1" style={{ color: "var(--modal-muted-fg)" }}>Audio Attachment</p>
                                </div>
                                <audio controls src={target.fileUrl} className="w-full" autoPlay={false}>
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        ) : isVideo ? (
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                                <video controls src={target.fileUrl} className="max-h-[72vh] w-auto max-w-full rounded-lg" />
                            </div>
                        ) : isPdf ? (
                            <div
                                className="flex h-full w-full flex-col overflow-hidden rounded-xl border"
                                style={{
                                    background: "var(--modal-bg)",
                                    borderColor: "var(--modal-border)",
                                }}
                            >
                                <iframe
                                    src={target.fileUrl}
                                    title={target.fileName}
                                    className="h-full w-full rounded-xl border-0"
                                />
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md w-full rounded-2xl border shadow-xl"
                                style={{
                                    background: "var(--modal-bg)",
                                    borderColor: "var(--modal-border)",
                                }}
                            >
                                <div
                                    className="flex h-20 w-20 items-center justify-center rounded-full ring-4"
                                    style={{
                                        background: "var(--modal-bg-muted)",
                                        color: "var(--modal-fg)",
                                    }}
                                >
                                    <FileText size={36} />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold" style={{ color: "var(--modal-fg)" }}>{target.fileName}</h3>
                                    <p className="text-xs mt-1" style={{ color: "var(--modal-muted-fg)" }}>
                                        {ext ? `${ext.toUpperCase()} Document` : 'File Attachment'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition active:scale-95 mt-2"
                                >
                                    <Download size={18} />
                                    <span>Download File</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer Bar */}
                    <div
                        className="flex flex-shrink-0 items-center justify-between border-t px-5 py-3 text-xs"
                        style={{
                            borderColor: "var(--modal-border)",
                            background: "var(--modal-bg)",
                            color: "var(--modal-muted-fg)",
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <FileCheck size={15} className="text-emerald-500" />
                            <span>Ready to view and download</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 transition"
                        >
                            <Download size={14} />
                            <span>Re-download file</span>
                        </button>
                    </div>
                </div>
            </div>
        ) as React.ReactNode,
        portalTarget,
    );
}
