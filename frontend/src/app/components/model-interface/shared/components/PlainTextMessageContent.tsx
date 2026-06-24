import React from 'react';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

interface PlainTextMessageContentProps {
    /** Prefer a string; token-shaped objects and nested parts are coerced for safety. */
    children: React.ReactNode;
}

/** Renders message text as plain text (no markdown/HTML interpretation). */
export function PlainTextMessageContent({ children }: PlainTextMessageContentProps) {
    const text = textPartToPlainString(children as unknown);
    if (!text.trim()) {
        return null;
    }
    return (
        <div className="chat-plain-text whitespace-pre-wrap break-words">{text}</div>
    );
}
