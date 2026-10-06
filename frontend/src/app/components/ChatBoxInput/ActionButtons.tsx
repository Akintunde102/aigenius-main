import React from 'react';
import { Paperclip, Mic, Phone, Loader2, X, Check } from 'lucide-react';
import { ActionButtonsProps } from './types';
import { FEATURE_FLAGS } from '@/lib/config/features';
import { useLanguage } from '@/lib/providers/LanguageProvider';

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
    const { t } = useLanguage();
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
                    title={t('composer.enterAudioMode', 'Enter Audio Mode')}
                    aria-label={t('composer.enterAudioMode', 'Enter Audio Mode')}
                    disabled={disabled}
                    onClick={() => onAudioModeToggle(!isAudioMode)}
                >
                    <Phone size={12} />
                </button>
            ) : null}

            {/* Mic / STT Toggle (or Cancel / Confirm) — hidden unless VOICE_DICTATION is enabled */}
            {FEATURE_FLAGS.VOICE_DICTATION && micTranscribing ? (
                <button
                    type="button"
                    className="p-1.5 rounded-full text-blue-500 bg-blue-50 disabled:opacity-50 cursor-not-allowed"
                    title={t('composer.transcribing', 'Transcribing...')}
                    aria-label={t('composer.transcribing', 'Transcribing...')}
                    disabled
                >
                    <Loader2 size={12} className="animate-spin" />
                </button>
            ) : FEATURE_FLAGS.VOICE_DICTATION && isSTTActive ? (
                <div className="flex items-center space-x-1">
                    {/* Cancel Button (Outline Style - matches other composer controls) */}
                    <button
                        type="button"
                        className="p-1.5 rounded-full [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors"
                        title={t('composer.cancelRecording', 'Cancel recording')}
                        aria-label={t('composer.cancelRecording', 'Cancel recording')}
                        onClick={() => onCancelSTT?.()}
                    >
                        <X size={12} />
                    </button>
                    {/* Confirm Button (Solid Accent Style - matches main send button) */}
                    <button
                        type="button"
                        className="p-1.5 rounded-full text-white bg-[var(--chat-accent)] hover:opacity-90 transition-colors animate-pulse"
                        title={t('composer.keepTranscription', 'Keep transcription')}
                        aria-label={t('composer.keepTranscription', 'Keep transcription')}
                        onClick={() => onConfirmSTT?.()}
                    >
                        <Check size={12} />
                    </button>
                </div>
            ) : FEATURE_FLAGS.VOICE_DICTATION ? (
                <button
                    type="button"
                    className="p-1.5 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={t('composer.speak', 'Speak')}
                    aria-label={t('composer.speak', 'Speak')}
                    disabled={disabled}
                    onClick={onStartSTT}
                >
                    <Mic size={12} />
                </button>
            ) : null}

            {/* File attachment button */}
            <button
                type="button"
                className={`rounded-full p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-50 [color:var(--chat-muted-fg)] hover:[color:var(--sidebar-fg)] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] ${!supportsFileUpload ? "cursor-not-allowed opacity-40" : ""}`}
                title={supportsFileUpload ? t('composer.attachFiles', 'Add attachment') : t('composer.fileUploadNotSupported', 'File upload not supported')}
                aria-label={supportsFileUpload ? t('composer.attachFiles', 'Add attachment') : t('composer.fileUploadNotSupported', 'File upload not supported')}
                disabled={disabled || !supportsFileUpload}
                onClick={onAttachmentClick}
            >
                <Paperclip size={12} />
            </button>
        </div>
    );
};
