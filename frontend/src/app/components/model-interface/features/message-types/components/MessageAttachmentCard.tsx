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
    const ext = fileExtensionLabel(fileName);

    if (kind === 'image' && fileUrl) {
        return (
            <div className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600" title={fileName}>
                <button
                    type="button"
                    onClick={() => onImagePreview?.(fileUrl)}
                    className="h-full w-full overflow-hidden rounded-xl"
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
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium text-white">
                        {statusLabel}
                    </span>
                ) : null}
                {onRemove ? (
                    <button
                        type="button"
                        onClick={onRemove}
                        disabled={disabled}
                        className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50"
                        title="Remove"
                        aria-label="Remove attachment"
                    >
                        <X size={8} />
                    </button>
                ) : null}
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 dark:bg-black/60">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    </div>
                ) : null}
            </div>
        );
    }

    const cardContent = (
        <div className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600" title={fileName}>
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                {kind === 'audio' ? (
                    <Music2 size={20} className="text-slate-400 dark:text-slate-500" />
                ) : (
                    <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                )}
                <span className="max-w-[64px] truncate text-[9px] font-medium text-slate-600 dark:text-slate-300">
                    {fileName}
                </span>
                {ext && (
                    <span className="rounded bg-orange-100 px-1 py-px text-[8px] font-bold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                        {ext}
                    </span>
                )}
            </div>
            {statusLabel ? (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium text-white">
                    {statusLabel}
                </span>
            ) : null}
            {onRemove ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove();
                    }}
                    disabled={disabled}
                    className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-600 disabled:opacity-50"
                    title="Remove"
                    aria-label="Remove attachment"
                >
                    <X size={8} />
                </button>
            ) : null}
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 dark:bg-black/60">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                </div>
            ) : null}
        </div>
    );

    if (fileUrl && !onRemove) {
        return (
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={fileName}
                aria-label={`Open file ${fileName}`}
                className="inline-block"
            >
                {cardContent}
            </a>
        );
    }

    return cardContent;
};
