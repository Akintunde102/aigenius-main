import React from 'react';
import { Paperclip, Mic, Phone, Loader2, X, Check } from 'lucide-react';
import { ActionButtonsProps } from './types';
import { FEATURE_FLAGS } from '@/lib/config/features';

export const ActionButtons: React.FC<ActionButtonsProps> = ({
    disabled,
    supportsFileUpload,
    onAttachmentClick,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    onCancelSTT,
    onConfirmSTT,
    isSTTActive,
    isDictationTranscribing = false,
}) => {
    /** Dictation-only — do not tie to conversational `audioStatus` or the mic flickers in phone mode. */
    const micTranscribing = isDictationTranscribing;

    return (
        <div className="flex items-center space-x-1.5">
            {/* Conversational audio mode (phone) — mic dictation stays available below */}
            {FEATURE_FLAGS.AUDIO_CONVERSATION && onAudioModeToggle ? (
                <button
                    type="button"
                    className={`p-1.5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isAudioMode ? 'text-green-500 bg-green-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                        }`}
                    title="Enter Audio Mode"
                    disabled={disabled}
                    onClick={() => onAudioModeToggle(!isAudioMode)}
                >
                    <Phone size={12} />
                </button>
            ) : null}

            {/* Mic / STT Toggle (or Cancel / Confirm) */}
            {micTranscribing ? (
                <button
                    type="button"
                    className="p-1.5 rounded-full text-blue-500 bg-blue-50 disabled:opacity-50 cursor-not-allowed"
                    title="Transcribing..."
                    disabled
                >
                    <Loader2 size={12} className="animate-spin" />
                </button>
            ) : isSTTActive ? (
                <div className="flex items-center space-x-1">
                    {/* Cancel Button (Outline Style - matches other composer controls) */}
                    <button
                        type="button"
                        className="p-1.5 rounded-full [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
                        title="Cancel recording"
                        onClick={onCancelSTT}
                    >
                        <X size={12} />
                    </button>
                    {/* Confirm Button (Solid Accent Style - matches main send button) */}
                    <button
                        type="button"
                        className="p-1.5 rounded-full text-white bg-[var(--chat-accent)] hover:opacity-90 transition-colors animate-pulse"
                        title="Keep transcription"
                        onClick={onConfirmSTT}
                    >
                        <Check size={12} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    className="p-1.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Voice Input"
                    disabled={disabled}
                    onClick={onStartSTT}
                >
                    <Mic size={12} />
                </button>
            )}

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
