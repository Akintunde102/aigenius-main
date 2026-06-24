import React from 'react';

interface MessageHeaderProps {
    role: string;
    modelName: string;
    /** When true, assistant title is omitted (shown in footer before time). */
    suppressAssistantHeader?: boolean;
}

export const MessageHeader: React.FC<MessageHeaderProps> = ({
    role,
    modelName,
    suppressAssistantHeader = false,
}) => {
    if (role === "assistant" && suppressAssistantHeader) {
        return null;
    }

    return (
        <div className="mb-2">
            {role === "assistant" && (
                <div className="text-[14px] text-gray-700 font-semibold">{modelName}</div>
            )}
            {role === "user" && (
                <div className="text-[14px] text-gray-700 font-semibold">You</div>
            )}
        </div>
    );
};
