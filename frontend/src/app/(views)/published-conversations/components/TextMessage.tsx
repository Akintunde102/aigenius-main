import React from 'react';
import { MarkdownRenderer } from '@/app/components/model-interface/shared/components';
import { chatReadingFont } from '@/app/components/model-interface/shared/fonts/chatReadingFont';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';

interface TextMessageProps {
    content: string;
    streaming: boolean;
    role: string;
}

export const TextMessage: React.FC<TextMessageProps> = ({ content, streaming, role }) => (
    <>
        <div className={chatReadingFont.className}>
            <MarkdownRenderer content={textPartToPlainString(content)} />
        </div>
        {streaming && role === 'assistant' && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1 align-text-bottom"></span>
        )}
    </>
);
