import React from 'react';
import { ArrowUp } from 'lucide-react';
import { SubmitButtonProps } from './types';

export const SubmitButton: React.FC<SubmitButtonProps> = ({
    inputValue,
    disabled,
    uploading,
    onSubmit
}) => {
    const isEnabled = inputValue.trim() && !disabled && !uploading;

    return (
        <button
            type="submit"
            disabled={!isEnabled}
            onClick={onSubmit}
            className={`rounded-full p-1.5 transition-colors ${isEnabled
                ? "[background-color:var(--send-btn-bg,#ecece9)] [color:var(--send-btn-fg,#1c1c1a)] hover:opacity-85 dark:[background-color:var(--chat-accent)] dark:text-white dark:hover:[background-color:var(--chat-accent-hover)]"
                : "cursor-not-allowed opacity-50 [background-color:var(--send-btn-bg,#ecece9)] [color:var(--send-btn-fg,#1c1c1a)] dark:opacity-100 dark:[background-color:var(--chat-accent-muted)] dark:[color:var(--chat-muted-fg)]"
                }`}
            title="Send message"
        >
            <ArrowUp size={16} />
        </button>
    );
}; 