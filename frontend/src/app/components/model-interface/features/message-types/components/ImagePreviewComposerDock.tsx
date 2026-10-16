'use client';

import React, { useId, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

export interface ImagePreviewComposerDockProps {
    children: React.ReactNode;
    expandLabel?: string;
    collapseLabel?: string;
}

export function ImagePreviewComposerDock({
    children,
    expandLabel = 'Message',
    collapseLabel = 'Hide message box',
}: ImagePreviewComposerDockProps) {
    const [expanded, setExpanded] = useState(false);
    const panelId = useId();

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-[10003] flex flex-col items-center px-3 pb-3 pt-1 sm:pb-4 pointer-events-none"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="pointer-events-auto flex w-full max-w-3xl flex-col items-stretch gap-2">
                {expanded ? (
                    <>
                        <button
                            type="button"
                            onClick={() => setExpanded(false)}
                            className="mx-auto flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg transition hover:opacity-90 active:scale-[0.98]"
                            style={{
                                background: 'var(--modal-bg)',
                                borderColor: 'var(--modal-border)',
                                color: 'var(--modal-fg)',
                            }}
                            aria-expanded={true}
                            aria-controls={panelId}
                        >
                            <ChevronDown size={14} aria-hidden />
                            {collapseLabel}
                        </button>
                        <div
                            id={panelId}
                            className="w-full rounded-2xl border p-2 shadow-2xl backdrop-blur-md sm:p-3"
                            style={{
                                background: 'var(--modal-bg)',
                                borderColor: 'var(--modal-border)',
                            }}
                        >
                            {children}
                        </div>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="mx-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-lg transition hover:opacity-90 active:scale-[0.98]"
                        style={{
                            background: 'var(--modal-bg)',
                            borderColor: 'var(--modal-border)',
                            color: 'var(--modal-fg)',
                        }}
                        aria-expanded={false}
                        aria-controls={panelId}
                    >
                        <MessageSquare size={16} aria-hidden />
                        {expandLabel}
                        <ChevronUp size={16} aria-hidden />
                    </button>
                )}
            </div>
        </div>
    );
}
