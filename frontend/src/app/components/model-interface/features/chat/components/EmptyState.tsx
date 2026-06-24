import React from 'react';

export const EmptyState: React.FC = () => {

    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
            style={{ color: "var(--chat-muted-fg)" }}
        >
            <span className="max-w-md text-[14px] font-normal leading-relaxed tracking-[0.01em]">
                Start a conversation with the model…
            </span>
        </div>
    );

};
