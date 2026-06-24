import React from 'react';

type AssistantStreamStatusProps = {
    /** True while waiting for the first streamed chunk (or first tool activity). */
    loading: boolean;
};

/**
 * Compact circular streaming indicator for the assistant message card (bottom-right).
 * Rolling ring spinner for the whole stream (connecting and generating).
 */
export function AssistantStreamStatus({ loading }: AssistantStreamStatusProps) {
    const label = loading ? 'Starting response' : 'Generating response';

    return (
        <div
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-[rgba(58,71,87,0.12)] bg-[rgba(255,255,255,0.5)] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_18px_-14px_rgba(31,42,55,0.22)] backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
            aria-label={label}
        >
            <span
                className="inline-block h-4 w-4 rounded-full border-2 border-[var(--app-accent-500)] border-t-transparent motion-safe:animate-spin motion-reduce:animate-none"
                aria-hidden
            />
        </div>
    );
}
