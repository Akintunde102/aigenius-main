import React from 'react';

interface MessageHeaderProps {
    role: string;
    displayName: string;
    avatarUrl?: string;
    /** Outer wrapper; default `mb-2`. Use `mb-0` when the header sits in a row with a trailing status chip. */
    className?: string;
    /** Hide assistant name/avatar here when shown in the message footer (e.g. before timestamp). */
    suppressAssistantHeader?: boolean;
}

export const MessageHeader: React.FC<MessageHeaderProps> = ({
    role,
    displayName,
    avatarUrl,
    className,
    suppressAssistantHeader = false,
}) => {
    if (role === "assistant" && suppressAssistantHeader) {
        return null;
    }

    if (role === "user") {
        return null;
    }

    return (
        <div className={className ?? 'mb-2'}>
            {role === "assistant" && (
                <div className="flex items-center gap-2">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            className="w-4 h-4 rounded object-cover"
                            width={16}
                            height={16}
                            loading="lazy"
                            decoding="async"
                        />
                    ) : null}
                    <div className="text-[14px] text-gray-700 font-semibold">{displayName}</div>
                </div>
            )}
        </div>
    );
};
