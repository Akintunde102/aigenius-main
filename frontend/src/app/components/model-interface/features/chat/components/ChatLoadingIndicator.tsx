import React from 'react';

interface ChatLoadingIndicatorProps {
    isLoading: boolean;
    message?: string;
}

const ChatLoadingIndicator: React.FC<ChatLoadingIndicatorProps> = ({
    isLoading,
    message = "Loading conversations..."
}) => {
    if (!isLoading) return null;

    return (
        <div className="flex items-center justify-center p-4 text-slate-400">
            <div
                className="mr-2 h-4 w-4 animate-spin rounded-full border-2"
                style={{ borderColor: "var(--modal-border)", borderTopColor: "var(--chat-accent)" }}
            />
            <span className="text-sm">{message}</span>
        </div>
    );
};

export default ChatLoadingIndicator;
