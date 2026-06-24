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
                ? "text-white [background-color:var(--chat-accent)] hover:[background-color:var(--chat-accent-hover)]"
                : "cursor-not-allowed [background-color:var(--chat-accent-muted)] [color:var(--chat-muted-fg)]"
                }`}
            title="Send message"
        >
            <ArrowUp size={16} />
        </button>
    );
}; 