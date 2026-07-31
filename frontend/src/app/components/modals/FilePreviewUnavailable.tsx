'use client';

import React from 'react';
import { ExternalLink, FileType2, FolderOpen, RotateCcw } from 'lucide-react';

export function formatPreviewError(
    error: string,
    fileName?: string,
): { title: string; detail: string; hint: string } {
    const lower = error.toLowerCase();
    if (lower.includes('unsupported') || lower.includes('binary')) {
        return {
            title: "Can't preview this file type",
            detail: fileName
                ? `${fileName} isn't something we can show in the editor.`
                : "This file type can't be shown in the preview panel.",
            hint: 'You can still open it with the default app on your computer, or reveal it in File Explorer.',
        };
    }
    if (lower.includes('failed to read') || lower.includes('media loading failed')) {
        const stripped = error
            .replace(/^Failed to read file:\s*/i, '')
            .replace(/^Media loading failed:\s*/i, '')
            .replace(/^Error:\s*/i, '');
        return {
            title: "Couldn't load this file",
            detail: stripped,
            hint: 'Try again, or open the file directly on your PC.',
        };
    }
    return {
        title: 'Preview unavailable',
        detail: error,
        hint: 'Try again, or open the file directly on your PC.',
    };
}

export function FilePreviewUnavailable({
    error,
    fileName,
    filePath,
    canOpenOnPc,
    onOpenInOS,
    onRevealInFolder,
    onRetry,
}: {
    error: string;
    fileName?: string;
    filePath?: string;
    canOpenOnPc: boolean;
    onOpenInOS: () => void;
    onRevealInFolder: () => void;
    onRetry: () => void;
}) {
    const { title, detail, hint } = formatPreviewError(error, fileName);

    return (
        <div
            className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center sm:px-10"
            style={{ background: 'var(--surface-muted)' }}
        >
            <div
                className="mb-6 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border"
                style={{
                    borderColor: 'color-mix(in srgb, var(--modal-border) 80%, transparent)',
                    background:
                        'linear-gradient(145deg, color-mix(in srgb, var(--modal-bg) 92%, var(--chat-accent) 8%), var(--modal-bg-muted))',
                    boxShadow: '0 12px 40px color-mix(in srgb, var(--modal-fg) 6%, transparent)',
                }}
            >
                <FileType2
                    size={34}
                    strokeWidth={1.5}
                    style={{ color: 'color-mix(in srgb, var(--modal-muted-fg) 88%, var(--chat-accent) 12%)' }}
                />
            </div>

            <div className="max-w-md space-y-3">
                <h3 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--modal-fg)' }}>
                    {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--modal-muted-fg)' }}>
                    {detail}
                </p>
                <p className="text-xs leading-relaxed opacity-80" style={{ color: 'var(--modal-muted-fg)' }}>
                    {hint}
                </p>
                {filePath && (
                    <p
                        className="truncate rounded-lg border px-3 py-2 font-mono text-[11px]"
                        style={{
                            color: 'var(--modal-muted-fg)',
                            borderColor: 'var(--modal-border)',
                            background: 'color-mix(in srgb, var(--modal-bg) 88%, transparent)',
                        }}
                        title={filePath}
                    >
                        {filePath}
                    </p>
                )}
            </div>

            <div className="mt-8 flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center">
                {canOpenOnPc && (
                    <>
                        <button
                            type="button"
                            onClick={onOpenInOS}
                            className="app-modal-btn-primary inline-flex flex-1 items-center justify-center gap-2 px-5 py-2.5 active:scale-[0.98] sm:min-w-[10.5rem]"
                        >
                            <ExternalLink size={16} />
                            Open on this PC
                        </button>
                        <button
                            type="button"
                            onClick={onRevealInFolder}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors hover:opacity-90 active:scale-[0.98] sm:min-w-[10.5rem]"
                            style={{
                                color: 'var(--modal-fg)',
                                borderColor: 'var(--modal-border)',
                                background: 'var(--modal-bg)',
                            }}
                        >
                            <FolderOpen size={16} />
                            Show in Explorer
                        </button>
                    </>
                )}
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:opacity-90 active:scale-[0.98]"
                    style={{ color: 'var(--modal-muted-fg)' }}
                >
                    <RotateCcw size={15} />
                    Try again
                </button>
            </div>
        </div>
    );
}
