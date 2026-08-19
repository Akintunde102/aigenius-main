import React, { useState } from 'react';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { chatReadingFont } from '@/app/components/model-interface/shared/fonts/chatReadingFont';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

export interface TextMessageProps {
    content: string;
    streaming: boolean;
    role: string;
    /** Collapse long user messages with show more (main chat). */
    collapseLongUserMessages?: boolean;
    /** Apply published-conversation reading font. */
    useChatReadingFont?: boolean;
}

const CHARACTER_LIMIT = 500;

export const TextMessage: React.FC<TextMessageProps> = ({
    content,
    streaming,
    role,
    collapseLongUserMessages = false,
    useChatReadingFont = false,
}) => {
    const [expanded, setExpanded] = useState(false);
    const plainContent = textPartToPlainString(content);

    const isLongUserMsg =
        collapseLongUserMessages && role === 'user' && plainContent.length > CHARACTER_LIMIT;

    const displayContent =
        isLongUserMsg && !expanded
            ? `${plainContent.slice(0, CHARACTER_LIMIT)}...`
            : plainContent;

    const streamingIndicator =
        streaming && role === 'assistant' ? (
            <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#3B82F6] align-text-bottom" />
        ) : null;

    const body = (
        <>
            <MarkdownRenderer content={displayContent} />
            {isLongUserMsg && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 cursor-pointer self-start border-none bg-transparent p-0 text-[13px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                    {expanded ? 'Show less' : '...more'}
                </button>
            )}
            {streamingIndicator}
        </>
    );

    if (useChatReadingFont) {
        return <div className={chatReadingFont.className}>{body}</div>;
    }

    return <div className="relative flex w-full flex-col">{body}</div>;
};
