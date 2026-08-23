import React from 'react';

interface SessionInfoProps {
    title: string;
    isActive?: boolean;
    isGenerating?: boolean;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
    title,
    isActive = false,
    isGenerating = false,
}) => {
    const statusLabel = isGenerating
        ? `${title} — generating`
        : title;

    return (
        <span
            className={`sidebar-nav-label flex min-w-0 flex-1 items-center gap-1.5 ${isActive ? "font-medium" : "font-normal"}`}
            style={{ color: "var(--sidebar-fg)" }}
            title={statusLabel}
        >
            {isGenerating ? (
                <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse"
                    style={{ backgroundColor: "var(--chat-accent)" }}
                    aria-hidden
                />
            ) : null}
            <span className="min-w-0 truncate">{title}</span>
        </span>
    );
};
