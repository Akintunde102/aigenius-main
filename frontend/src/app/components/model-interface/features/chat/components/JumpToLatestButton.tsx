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
        <div className="pointer-events-none sticky bottom-3 z-30 flex w-full justify-center">
            <button
                type="button"
                onClick={onClick}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[color:var(--app-border-soft)] bg-[var(--app-panel)] px-3 py-1.5 text-xs font-medium text-[color:var(--app-ink-700)] shadow-[var(--app-shadow-soft)] backdrop-blur-sm transition hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)]"
                aria-label="Jump to latest message"
            >
                <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                Latest
            </button>
        </div>
    );
}
