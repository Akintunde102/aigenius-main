'use client';

import React from 'react';
import { ArrowDown } from 'lucide-react';

type JumpToLatestButtonProps = {
    visible: boolean;
    onClick: () => void;
};

export function JumpToLatestButton({ visible, onClick }: JumpToLatestButtonProps) {
    if (!visible) {
        return null;
    }

    return (
        <div
            className="pointer-events-none sticky bottom-3 z-30 grid w-full grid-cols-1 md:grid-cols-[1fr_min(100%,720px)_1fr]"
        >
            <div className="hidden md:block" aria-hidden />
            <div className="hidden md:block" aria-hidden />
            <div className="flex justify-end pr-1 md:justify-center md:pr-0">
                <button
                    type="button"
                    onClick={onClick}
                    className="pointer-events-auto inline-flex size-8 items-center justify-center rounded-full border border-[color:var(--app-border-soft)] bg-[var(--app-panel)] text-[color:var(--app-ink-700)] shadow-[var(--app-shadow-soft)] backdrop-blur-sm transition hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)]"
                    aria-label="Jump to latest message"
                >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
            </div>
        </div>
    );
}
