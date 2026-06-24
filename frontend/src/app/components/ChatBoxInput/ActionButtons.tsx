import React from 'react';
import { Paperclip, Mic, Phone, Loader2 } from 'lucide-react';
import { ActionButtonsProps } from './types';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    disabled,
    supportsFileUpload,
    onAttachmentClick,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    isSTTActive,
    isDictationTranscribing = false,
}) => {
    /** Dictation-only — do not tie to conversational `audioStatus` or the mic flickers in phone mode. */
    const micTranscribing = isDictationTranscribing;

    return (
        <div className="flex items-center space-x-1.5">
            {/* Audio Mode Toggle */}
            <button
                type="button"
                className={`p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isAudioMode ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                    }`}
                title="Enter Audio Mode"
                disabled={disabled}
                onClick={() => onAudioModeToggle?.(!isAudioMode)}
            >
                <Phone size={12} />
            </button>

            {/* Mic / STT Toggle */}
            <button
                type="button"
                className={`p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${micTranscribing
                        ? 'text-blue-500 bg-blue-50'
                        : isSTTActive
                            ? 'text-red-500 bg-red-50 animate-pulse'
                            : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'
                    }`}
                title={micTranscribing ? "Transcribing..." : "Voice Input"}
                disabled={disabled || micTranscribing}
                onClick={onStartSTT}
            >
                {micTranscribing ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <Mic size={12} />
                )}
            </button>

            {/* File attachment button */}
            <button
                type="button"
                className={`rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] ${!supportsFileUpload ? "cursor-not-allowed opacity-40" : ""}`}
                title={supportsFileUpload ? "Add attachment" : "File upload not supported"}
                disabled={disabled || !supportsFileUpload}
                onClick={onAttachmentClick}
            >
                <Paperclip size={12} />
            </button>
        </div>
    );
};
