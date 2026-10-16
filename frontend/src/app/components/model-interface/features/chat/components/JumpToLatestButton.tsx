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
            className="pointer-events-none absolute bottom-full left-[70%] z-50 mb-2 -translate-x-1/2 sm:left-[72%]"
        >
            <button
                type="button"
                onClick={onClick}
                className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--app-border-soft)] bg-[var(--app-panel)] text-[color:var(--app-ink-700)] shadow-lg backdrop-blur-md transition-all hover:bg-[var(--app-panel-hover,var(--app-panel))] hover:text-[color:var(--app-ink-900)] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--chat-accent)]"
                aria-label="Scroll to bottom"
            >
                <ArrowDown className="h-4 w-4" aria-hidden />
            </button>
        </div>
    );
}
