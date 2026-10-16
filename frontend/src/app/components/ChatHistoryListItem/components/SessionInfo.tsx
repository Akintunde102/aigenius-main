import React from 'react';
import { Square } from 'lucide-react';

interface SessionInfoProps {
    title: string;
    isActive?: boolean;
    isGenerating?: boolean;
    onStopGenerating?: () => void;
    isUnread?: boolean;
    relativeTime?: string;
    labels?: { id: string; name: string; color: string }[];
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
    title,
    isActive = false,
    isGenerating = false,
    onStopGenerating,
    isUnread = false,
    relativeTime,
    labels,
}) => {
    const statusLabel = isGenerating
        ? `${title} — generating`
        : isUnread
            ? `${title} — unread`
            : title;

    const handleStopClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStopGenerating?.();
    };

    return (
        <span
            className="text-xs flex min-w-0 flex-1 items-center justify-between gap-1.5"
            style={{ color: "var(--sidebar-fg)" }}
            title={statusLabel}
        >
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {isGenerating ? (
                    onStopGenerating ? (
                        <button
                            type="button"
                            className="group/loader relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                            style={{ outlineColor: "var(--chat-accent, #0ea5e9)" }}
                            onClick={handleStopClick}
                            aria-label="Stop generation"
                            title="Stop generation"
                        >
                            <svg
                                className="h-3 w-3 motion-safe:animate-spin transition-opacity group-hover/loader:opacity-0"
                                style={{ color: "var(--chat-accent, #0ea5e9)" }}
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                aria-hidden
                            >
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            <Square
                                size={10}
                                fill="currentColor"
                                strokeWidth={0}
                                className="pointer-events-none absolute opacity-0 transition-opacity group-hover/loader:opacity-100"
                                style={{ color: "var(--chat-accent, #0ea5e9)" }}
                                aria-hidden
                            />
                        </button>
                    ) : (
                        <svg
                            className="h-3 w-3 animate-spin shrink-0"
                            style={{ color: "var(--chat-accent, #0ea5e9)" }}
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            aria-hidden
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    )
                ) : isUnread ? (
                    <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_8px_rgba(14,165,233,0.8)] motion-safe:animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]"
                        style={{ backgroundColor: "var(--chat-accent, #0ea5e9)" }}
                        aria-hidden
                    />
                ) : null}
                <span className={`min-w-0 truncate transition-opacity ${
                    isActive ? "font-medium opacity-100" : "font-[350] opacity-92 group-hover:opacity-100"
                }`}>
                    {title}
                </span>
                {labels && labels.length > 0 ? (
                    <span className="flex items-center gap-1 shrink-0 ml-0.5" aria-hidden>
                        {labels.map((l) => (
                            <span
                                key={l.id}
                                className="inline-block h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: l.color }}
                                title={l.name}
                            />
                        ))}
                    </span>
                ) : null}
            </span>
            {relativeTime ? (
                <span
                    className="shrink-0 text-[11px] font-normal opacity-0 transition-opacity group-hover:opacity-100"
                    style={{ color: "var(--sidebar-muted-fg)", opacity: 0.65 }}
                >
                    {relativeTime}
                </span>
            ) : null}
        </span>
    );
};
