'use client';

import React from 'react';
import { FileText, Loader2, Music2, X, Eye } from 'lucide-react';
import { fileExtensionLabel, type AttachmentKind } from './messageAttachment.utils';

export type MessageAttachmentCardProps = {
    kind: AttachmentKind;
    fileName: string;
    fileUrl?: string;
    onImagePreview?: (url: string, fileName?: string, kind?: AttachmentKind) => void;
    onPreview?: (attachment: { fileUrl: string; fileName: string; kind: AttachmentKind }) => void;
    onRemove?: () => void;
    isLoading?: boolean;
    statusLabel?: string;
    disabled?: boolean;
};

export const MessageAttachmentCard: React.FC<MessageAttachmentCardProps> = ({
    kind,
    fileName,
    fileUrl,
    onImagePreview,
    onPreview,
    onRemove,
    isLoading = false,
    statusLabel,
    disabled = false,
}) => {
    const ext = fileExtensionLabel(fileName);

    const handleCardClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!fileUrl) return;
        if (onPreview) {
            e.preventDefault();
            onPreview({ fileUrl, fileName, kind });
        } else if (onImagePreview) {
            e.preventDefault();
            onImagePreview(fileUrl, fileName, kind);
        }
    };

    if (kind === 'image' && fileUrl) {
        return (
            <div
                data-no-edit="true"
                data-attachment-card="true"
                className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600 cursor-pointer overflow-hidden"
                title={`View ${fileName}`}
                onClick={handleCardClick}
            >
                <button
                    type="button"
                    onClick={handleCardClick}
                    className="h-full w-full overflow-hidden rounded-xl"
                    title={fileName}
                    aria-label={`Open image ${fileName}`}
                >
                    <img
                        src={fileUrl}
                        alt={fileName}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-5 w-5 text-white drop-shadow-md" />
                    </div>
                </button>
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
    }

    const cardInnerContent = (
        <div
            data-no-edit="true"
            data-attachment-card="true"
            className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600 cursor-pointer overflow-hidden"
            title={`View ${fileName}`}
            onClick={fileUrl ? handleCardClick : undefined}
        >
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 transition-transform duration-300 group-hover:scale-105">
                {kind === 'audio' ? (
                    <Music2 size={20} className="text-orange-500 dark:text-orange-400" />
                ) : (
                    <FileText size={20} className="text-slate-400 dark:text-slate-500 group-hover:text-orange-500 transition-colors" />
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

    if (fileUrl && !onRemove && !onPreview && !onImagePreview) {
        return (
            <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={fileName}
                aria-label={`Open file ${fileName}`}
                className="inline-block"
                onClick={(e) => e.stopPropagation()}
            >
                {cardInnerContent}
            </a>
        );
    }

    return cardInnerContent;
};
