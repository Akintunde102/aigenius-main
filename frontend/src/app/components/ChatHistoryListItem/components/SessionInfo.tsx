import React from 'react';

interface SessionInfoProps {
    title: string;
    isActive?: boolean;
}

export const SessionInfo: React.FC<SessionInfoProps> = ({
    title,
    isActive = false
}) => {
    return (
        <span
            className={`sidebar-nav-label block min-w-0 flex-1 truncate ${isActive ? "font-medium" : "font-normal"}`}
            style={{ color: "var(--sidebar-fg)" }}
            title={title}
        >
            {title}
        </span>
    );
};
