'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Check, Link2, Download, UploadCloud, Loader2 } from 'lucide-react';

export interface ImagePreviewContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    onCopy: () => void;
    onCopyLink?: () => void;
    onDownload?: () => void;
    onSaveToUploads?: () => void;
    isSavingUpload?: boolean;
    savedToUpload?: boolean;
    copied?: boolean;
    linkCopied?: boolean;
}

export function ImagePreviewContextMenu({
    x,
    y,
    onClose,
    onCopy,
    onCopyLink,
    onDownload,
    onSaveToUploads,
    isSavingUpload = false,
    savedToUpload = false,
    copied = false,
    linkCopied = false,
}: ImagePreviewContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const onPointerDownOutside = (e: MouseEvent | PointerEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('pointerdown', onPointerDownOutside, true);
        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('pointerdown', onPointerDownOutside, true);
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [onClose]);

    if (typeof document === 'undefined') return null;

    // Viewport clamping
    const menuWidth = 190;
    const menuHeight = 130;
    const clampedX = Math.min(Math.max(12, x), (window.innerWidth || 800) - menuWidth - 12);
    const clampedY = Math.min(Math.max(12, y), (window.innerHeight || 600) - menuHeight - 12);

    const portalTarget = document.getElementById('modal-root') ?? document.body;

    return createPortal(
        (
            <div
                ref={menuRef}
                role="menu"
                aria-label="Image actions menu"
                data-testid="image-preview-context-menu"
                className="fixed z-[10002] min-w-[190px] select-none overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 text-zinc-800 dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:text-zinc-200"
                style={{
                    left: `${clampedX}px`,
                    top: `${clampedY}px`,
                }}
                onClick={(e) => e.stopPropagation()}
                onContextMenu={(e) => e.preventDefault()}
            >
                <button
                    type="button"
                    role="menuitem"
                    data-testid="context-menu-copy-image"
                    onClick={() => {
                        onCopy();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    ) : (
                        <Copy className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                    )}
                    <span className="flex-1 text-left">{copied ? 'Copied image!' : 'Copy image'}</span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-400 font-mono">Ctrl+C</span>
                </button>

                {onCopyLink && (
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="context-menu-copy-link"
                        onClick={() => {
                            onCopyLink();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15"
                    >
                        {linkCopied ? (
                            <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                            <Link2 className="h-4 w-4 text-sky-500 dark:text-sky-400 shrink-0" />
                        )}
                        <span className="flex-1 text-left">{linkCopied ? 'Copied link!' : 'Copy image link'}</span>
                    </button>
                )}

                {onDownload && (
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="context-menu-download-image"
                        onClick={() => {
                            onDownload();
                            onClose();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15"
                    >
                        <Download className="h-4 w-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                        <span className="flex-1 text-left">Download</span>
                    </button>
                )}

                {onSaveToUploads && (
                    <button
                        type="button"
                        role="menuitem"
                        data-testid="context-menu-save-upload"
                        onClick={() => {
                            onSaveToUploads();
                        }}
                        disabled={isSavingUpload}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 active:bg-zinc-200/70 dark:text-zinc-200 dark:hover:bg-white/10 dark:hover:text-white dark:active:bg-white/15 disabled:opacity-50"
                    >
                        {isSavingUpload ? (
                            <Loader2 className="h-4 w-4 text-blue-500 dark:text-cyan-400 animate-spin shrink-0" />
                        ) : savedToUpload ? (
                            <Check className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        ) : (
                            <UploadCloud className="h-4 w-4 text-blue-500 dark:text-cyan-400 shrink-0" />
                        )}
                        <span className="flex-1 text-left">
                            {isSavingUpload ? 'Saving to uploads...' : savedToUpload ? 'Saved to uploads!' : 'Save to uploads'}
                        </span>
                    </button>
                )}
            </div>
        ),
        portalTarget,
    );
}
