'use client';

import React from 'react';
import { RenderErrorBoundary } from '@/app/components/RenderErrorBoundary';
import { useLanguage } from '@/lib/providers/LanguageProvider';

export interface MessagePromptButtonsProps {
    labels: string[];
    disabled?: boolean;
    onSelect: (label: string) => void;
}

function MessagePromptButtonsInner({
    labels,
    disabled = false,
    onSelect,
}: MessagePromptButtonsProps) {
    const { t } = useLanguage();
    if (labels.length === 0) {
        return null;
    }

    return (
        <div
            className="mt-2 flex flex-wrap gap-1.5"
            role="group"
            aria-label={t('chat.promptButtonsAria', 'Suggested prompts')}
        >
            {labels.map((label) => (
                <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(label)}
                    className="app-chip max-w-full truncate !py-1 !px-2.5 text-left text-[11px] font-medium transition-colors hover:[background-color:color-mix(in_srgb,var(--chat-composer-border)_35%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                    title={label}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

export function MessagePromptButtons(props: MessagePromptButtonsProps) {
    return (
        <RenderErrorBoundary logLabel="[prompt-buttons]">
            <MessagePromptButtonsInner {...props} />
        </RenderErrorBoundary>
    );
}
