import React from 'react';

interface SessionInfoProps {
    title: string;
    isActive?: boolean;
    isGenerating?: boolean;
    isUnread?: boolean;
    relativeTime?: string;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
    title,
    isActive = false,
    isGenerating = false,
    isUnread = false,
    relativeTime,
}) => {
    const statusLabel = isGenerating
        ? `${title} — generating`
        : isUnread 
            ? `${title} — unread`
            : title;

    return (
        <span
            className="text-xs flex min-w-0 flex-1 items-center justify-between gap-1.5"
            style={{ color: "var(--sidebar-fg)" }}
            title={statusLabel}
        >
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
                {isGenerating ? (
                    <svg className="h-3 w-3 animate-spin shrink-0" style={{ color: "var(--chat-accent, #0ea5e9)" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
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

