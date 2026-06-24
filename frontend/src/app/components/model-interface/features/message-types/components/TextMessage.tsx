import React, { useState } from 'react';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

interface TextMessageProps {
    content: string;
    streaming: boolean;
    role: string;
}

export const TextMessage: React.FC<TextMessageProps> = ({ content, streaming, role }) => {
    const [expanded, setExpanded] = useState(false);
    const plainContent = textPartToPlainString(content);
    
    const CHARACTER_LIMIT = 500;
    const isLongUserMsg = role === 'user' && plainContent.length > CHARACTER_LIMIT;
    
    const displayContent = isLongUserMsg && !expanded
        ? plainContent.slice(0, CHARACTER_LIMIT) + '...'
        : plainContent;

    return (
        <div className="flex flex-col relative w-full">
            <MarkdownRenderer content={displayContent} />
            {isLongUserMsg && (
                <button 
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1 text-[13px] font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 self-start bg-transparent border-none p-0 cursor-pointer"
                >
                    {expanded ? 'Show less' : '...more'}
                </button>
            )}
            {streaming && role === 'assistant' && (
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#3B82F6] align-text-bottom" />
            )}
        </div>
    );
};
