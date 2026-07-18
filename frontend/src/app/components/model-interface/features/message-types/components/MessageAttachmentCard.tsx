'use client';

import React from 'react';
import { FileText, Loader2, Music2, X } from 'lucide-react';
import { fileExtensionLabel, type AttachmentKind } from './messageAttachment.utils';

export type MessageAttachmentCardProps = {
    kind: AttachmentKind;
    fileName: string;
    fileUrl?: string;
    onImagePreview?: (url: string) => void;
    onRemove?: () => void;
    isLoading?: boolean;
    statusLabel?: string;
    disabled?: boolean;
};

function shellClassForKind(kind: AttachmentKind): string {
    const base =
        'relative inline-flex shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle,#e5e7eb)] bg-[var(--surface-muted,#f8fafc)] shadow-sm transition hover:border-[var(--border-strong,#cbd5e1)]';
    if (kind === 'image') {
        return `${base} h-28 w-28`;
    }
    return `${base} h-28 w-36`;
}

function AttachmentCardFooter({ fileName }: { fileName: string }) {
    const extension = fileExtensionLabel(fileName);

    return (
        <div className="flex min-h-0 items-center gap-2 px-2 py-1.5">
            <span className="shrink-0 rounded bg-[#f4e7df] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#9a3412]">
                {extension}
            </span>
            <span className="truncate text-xs text-[var(--text-primary,#0f172a)]">
                {fileName}
            </span>
        </div>
    );
}

export const MessageAttachmentCard: React.FC<MessageAttachmentCardProps> = ({
    kind,
    fileName,
    fileUrl,
    onImagePreview,
    onRemove,
    isLoading = false,
    statusLabel,
    disabled = false,
}) => {
    const shellClass = shellClassForKind(kind);

    if (kind === 'image' && fileUrl) {
        return (
            <div className={`${shellClass} relative`} title={fileName}>
                <button
                    type="button"
                    onClick={() => onImagePreview?.(fileUrl)}
                    className="h-full w-full overflow-hidden"
                    title={fileName}
                    aria-label={`Open image ${fileName}`}
                >
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                    />
                </button>
                {statusLabel ? (
                    <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {statusLabel}
                    </span>
                ) : null}
                {onRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="absolute -right-1 -top-1 rounded-full bg-red-500/90 p-0.5 text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                        title="Remove"
                        aria-label="Remove attachment"
                    >
                        <X size={10} />
                    </button>
                ) : null}
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted,#64748b)]" />
                    </div>
                ) : null}
            </div>
        );
    }

    const body = (
        <>
            <div className="relative flex flex-1 items-center justify-center border-b border-[var(--border-subtle,#e5e7eb)] bg-white px-3">
                {kind === 'audio' && fileUrl ? (
                    <audio controls src={fileUrl} className="h-8 w-full max-w-full" preload="metadata" />
                ) : (
                    <div className="flex h-14 w-11 flex-col gap-1 rounded-sm border border-[var(--border-subtle,#e5e7eb)] bg-[var(--surface-muted,#f8fafc)] p-1.5 shadow-inner">
                        <div className="h-1 w-full rounded bg-[var(--border-subtle,#e5e7eb)]" />
                        <div className="h-1 w-4/5 rounded bg-[var(--border-subtle,#e5e7eb)]" />
                        <div className="h-1 w-full rounded bg-[var(--border-subtle,#e5e7eb)]" />
                        <div className="mt-auto flex justify-center">
                            {kind === 'audio' ? (
                                <Music2 className="h-4 w-4 text-[var(--text-muted,#64748b)]" />
                            ) : (
                                <FileText className="h-4 w-4 text-[var(--text-muted,#64748b)]" />
                            )}
                        </div>
                    </div>
                )}
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted,#64748b)]" />
                    </div>
                ) : null}
            </div>
            <AttachmentCardFooter fileName={fileName} />
            {statusLabel ? (
                <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {statusLabel}
                </span>
            ) : null}
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500/90 p-0.5 text-white shadow-sm transition hover:bg-red-600 disabled:opacity-50"
                    title="Remove"
                    aria-label="Remove attachment"
                >
                    <X size={10} />
                </button>
            ) : null}
        </>
    );

    if (kind === 'file' && fileUrl && !onRemove) {
        return (
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={shellClass}
                title={fileName}
                aria-label={`Open file ${fileName}`}
            >
                {body}
            </a>
        );
    }

    return (
        <div className={shellClass} title={fileName}>
            {body}
        </div>
    );
};
