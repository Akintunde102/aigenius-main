import React from 'react';
import { useLanguage } from '@/lib/providers/LanguageProvider';

export const EmptyState: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div
            className="flex h-full w-full flex-col items-center justify-center px-6 text-center"
            style={{ color: "var(--chat-muted-fg)" }}
        >
            <span
                className="max-w-md font-normal leading-relaxed tracking-[0.01em]"
                style={{ fontSize: "var(--chat-body-size)" }}
            >
                {t('chat.emptyState', 'Start a conversation with the model…')}
            </span>
        </div>
    );
};
