import React, { useRef, useImperativeHandle, forwardRef, useEffect, useCallback, useState } from 'react';
import { FileText, Loader2, X } from 'lucide-react';
import { UploadProgressBar } from './UploadProgressBar';
import { ChatTextarea } from './ChatTextarea';
import { ChatControls } from './ChatControls';
import { ChatBoxInputProps } from './types';
import ChatBoxStyles from './components/ChatBoxStyles';
import { useFileUpload } from './hooks/useFileUpload';
import { useInputState } from './hooks/useInputState';
import { useGlistenEffect } from './hooks/useGlistenEffect';
import { getContainerStyles } from './utils/styles';

/** True when viewport is wide (PC); false for mobile viewport. Uses 768px breakpoint to match app layout. */
function useIsPc() {
    const [isPc, setIsPc] = useState(() =>
        typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches
    );
    useEffect(() => {
        const mql = window.matchMedia('(min-width: 769px)');
        const handler = () => setIsPc(mql.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);
    return isPc;
}

const ChatBoxInput = forwardRef<any, ChatBoxInputProps & { onShowSavedChats?: () => void, onFocus?: () => void, onBlur?: () => void }>(({
    onSendMessage,
    onFileUpload,
    onCancelUpload,
    models,
    selectedModel,
    onModelChange,
    onModelNameClick,
    placeholder = "How can I help you today?",
    responseInProgress = false,
    onStopGeneration,
    className = "",
    uploading = false,
    uploadProgress = null,
    supportsFileUpload = true,
    onAttachmentMenuRequest,
    uploadedFiles = [],
    onRemoveUploadedFile,
    inputValue: externalInputValue,
    onInputChange,
    onShowSavedChats,
    sidebarStyle = false,
    streaming = true,
    onStreamingToggle,
    onFocus,
    onBlur,
    selectedPersonalityName,
    onPersonalityClick,
    selectedPersonalityIconUrl,
    onClearPersonality,
    compact = false,
    hideModelSelector = false,
    hideUpload = false,
    mini = false,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    onCancelSTT,
    onConfirmSTT,
    isSTTActive,
    isDictationTranscribing,
    audioStatus,
    audioTranscription,
    audioNotice
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Custom hooks
    const isPc = useIsPc();
    const glisten = useGlistenEffect();
    const { inputValue, handleInputChange, clearInput, flushInputToParent } = useInputState({
        externalInputValue,
        onInputChange
    });

    const controlsDisabled = responseInProgress || uploading;

    const {
        fileInputRef,
        handleFileInputChange,
        handleAttachmentClick,
        handlePaste,
        resetFileInfo,
        pendingFiles,
        queueFiles,
        removePendingFile,
        openLocalFilePicker,
    } = useFileUpload({
        onFileUpload,
        onCancelUpload,
        onAttachmentMenuRequest,
        uploading,
        disabled: controlsDisabled,
        supportsFileUpload
    });

    // Expose focusInput method to parent
    useImperativeHandle(ref, () => ({
        focusInput: () => {
            textareaRef.current?.focus();
        },
        queueFiles: (files: File[]) => {
            queueFiles(files);
        },
        openLocalFilePicker: () => {
            openLocalFilePicker();
        },
    }));

    // Reset file info when not uploading
    useEffect(() => {
        if (!uploading) {
            resetFileInfo();
        }
    }, [uploading, resetFileInfo]);

    const sendBlocked = responseInProgress || uploading;

    const onSendMessageRef = useRef(onSendMessage);
    useEffect(() => {
        onSendMessageRef.current = onSendMessage;
    }, [onSendMessage]);

    const handleSubmit = useCallback(
        async (e: React.FormEvent | React.MouseEvent) => {
            e.preventDefault();
            console.log('[ChatBoxInput] handleSubmit triggered', {
                inputValue: inputValue.trim(),
                hasFiles: uploadedFiles.length > 0,
                sendBlocked,
                responseInProgress,
                uploading
            });
            if ((inputValue.trim() || uploadedFiles.length > 0) && !sendBlocked) {
                console.log('[ChatBoxInput] Calling onSendMessage');
                flushInputToParent();
                const shouldClearComposer = await Promise.resolve(
                    onSendMessageRef.current(inputValue.trim(), selectedModel),
                );
                console.log('[ChatBoxInput] onSendMessage finished', { shouldClearComposer });
                if (shouldClearComposer !== false) {
                    clearInput();
                }
            } else {
                console.log('[ChatBoxInput] Submission blocked or empty input');
            }
        },
        [inputValue, uploadedFiles.length, sendBlocked, selectedModel, clearInput, flushInputToParent],
    );

    // PC: Enter = send, Shift+Enter = new line. Mobile: Enter and Shift+Enter = new line only (no keyboard submit).
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter') return;
        if (!isPc) return; // Mobile: never submit via keyboard; both Enter and Shift+Enter insert newline
        if (e.shiftKey) return; // PC: Shift+Enter = new line
        if (responseInProgress) return; // Let Enter insert a newline while a reply is in progress
        e.preventDefault();
        handleSubmit(e as any);
    }, [handleSubmit, isPc, responseInProgress]);



    const styles = getContainerStyles(sidebarStyle);


    const attachmentPreviews =
        uploadedFiles.length > 0 || pendingFiles.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
                {uploadedFiles.map((item, idx) => {
                    const displayName = item.displayName || item.file?.name || 'attachment';
                    const sourceLabel = item.source === 'library' ? 'From My files' : 'Uploaded';
                    return (
                        <div
                            key={`uploaded-${idx}`}
                            className="relative flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/80 px-2 py-1 max-w-full dark:border-emerald-800/50 dark:bg-emerald-950/40"
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-white border border-green-100 overflow-hidden dark:border-emerald-900 dark:bg-emerald-950">
                                {item.isImage ? (
                                    <img
                                        src={item.fileUrl}
                                        alt={displayName}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <FileText size={16} className="text-green-500" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="text-xs text-green-900 truncate max-w-[160px] dark:text-emerald-100" title={displayName}>
                                    {displayName}
                                </div>
                                <div className="text-[10px] text-green-600 dark:text-emerald-400">
                                    {sourceLabel}
                                </div>
                            </div>
                            {onRemoveUploadedFile && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveUploadedFile(idx)}
                                    className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-sm"
                                    title="Remove"
                                    aria-label="Remove file"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {pendingFiles.map((item) => (
                    <div
                        key={item.id}
                        className="relative flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/80 px-2 py-1 max-w-full dark:border-sky-800/50 dark:bg-sky-950/40"
                    >
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-md bg-white border border-blue-100 overflow-hidden dark:border-sky-900 dark:bg-sky-950">
                            {item.isImage && item.previewUrl ? (
                                <img
                                    src={item.previewUrl}
                                    alt={item.file.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                />
                            ) : (
                                <FileText size={16} className="text-blue-500" />
                            )}
                            {item.status === 'uploading' && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center dark:bg-black/50">
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs text-blue-900 truncate max-w-[160px] dark:text-sky-100" title={item.file.name}>
                                {item.file.name}
                            </div>
                            <div className="text-[10px] text-blue-600 dark:text-sky-400">
                                {item.status === 'uploading' ? 'Uploading' : 'Queued'}
                                {item.status === 'uploading' && uploadProgress !== null ? ` • ${Math.round(uploadProgress)}%` : ''}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => removePendingFile(item.id)}
                            className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-500/90 hover:bg-red-600 text-white shadow-sm"
                            title="Remove"
                            aria-label="Remove file"
                        >
                            <X size={10} />
                        </button>
                    </div>
                ))}
            </div>
        ) : null;

    return (
        <div id="chat-input" className={`w-full mx-auto ${className}`} style={{ position: 'relative', zIndex: 10 }}>
            {/* Upload progress bar at the very top edge */}
            {uploading && (
                <UploadProgressBar
                    uploading={uploading}
                    uploadProgress={uploadProgress}
                    sidebarStyle={sidebarStyle}
                />
            )}

            {attachmentPreviews}

            <div className={styles.container}>
                <div className="relative flex flex-col">
                    {/* STT status pill — minimal, non-intrusive */}
                    {(isSTTActive || isDictationTranscribing || ((audioStatus === 'transcribing' || audioStatus === 'interrupted') && !isAudioMode)) && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '-2.4rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.3rem 0.85rem',
                                borderRadius: '999px',
                                background: 'rgba(15, 23, 42, 0.88)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(99, 179, 237, 0.35)',
                                boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {(isDictationTranscribing || audioStatus === 'transcribing') ? (
                                <Loader2
                                    size={11}
                                    style={{ color: '#63b3ed', animation: 'spin 1s linear infinite', flexShrink: 0 }}
                                />
                            ) : (
                                <span
                                    className="animate-pulse"
                                    style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: '50%',
                                        background: '#f87171',
                                        flexShrink: 0,
                                        display: 'inline-block',
                                    }}
                                />
                            )}
                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#93c5fd', letterSpacing: '0.04em' }}>
                                {isDictationTranscribing || audioStatus === 'transcribing' 
                                    ? 'Transcribing…' 
                                    : audioStatus === 'interrupted' 
                                        ? 'Interrupted' 
                                        : 'Listening…'}
                            </span>
                            {audioTranscription && (
                                <span style={{ fontSize: '0.68rem', color: '#60a5fa', opacity: 0.8, maxWidth: '14rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    "{audioTranscription}"
                                </span>
                            )}
                        </div>
                    )}

                    {/* Input area */}
                    <div className={styles.inputArea}>
                        {/* Hidden file input */}
                        <label htmlFor="chat-file-upload" className="sr-only">
                            Upload files
                        </label>
                        <input
                            id="chat-file-upload"
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileInputChange}
                            tabIndex={-1}
                            disabled={controlsDisabled}
                            multiple
                            accept="image/*,audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm,.mp4,.pdf,.txt,.csv,.json,.md,.xml"
                        />

                        <ChatTextarea
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            onPaste={handlePaste}
                            placeholder={
                                isDictationTranscribing
                                    ? "Transcribing your voice..."
                                    : isSTTActive
                                        ? "Listening... Speak now"
                                        : placeholder
                            }
                            textareaDisabled={isDictationTranscribing}
                            uploading={uploading}
                            responseInProgress={responseInProgress}
                            onStopGeneration={onStopGeneration}
                            textareaRef={textareaRef}
                            sidebarStyle={sidebarStyle}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onSubmit={handleSubmit}
                            submitTitle={isPc ? 'Send message (Enter). New line: Shift+Enter' : 'Send message'}
                            hasUploadedFiles={uploadedFiles.length > 0}
                            mini={mini}
                        />
                    </div>

                    <ChatControls
                        disabled={controlsDisabled}
                        uploading={uploading}
                        supportsFileUpload={supportsFileUpload && !hideUpload}
                        selectedModel={selectedModel}
                        onModelNameClick={onModelNameClick}
                        onAttachmentClick={handleAttachmentClick}
                        sidebarStyle={sidebarStyle}
                        streaming={streaming}
                        onStreamingToggle={onStreamingToggle}
                        glisten={glisten && !compact}
                        selectedPersonalityName={selectedPersonalityName}
                        onPersonalityClick={onPersonalityClick}
                        selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                        onClearPersonality={onClearPersonality}
                        compact={compact}
                        hideModelSelector={hideModelSelector}
                        hideUpload={hideUpload}
                        mini={mini}
                        onAudioModeToggle={onAudioModeToggle}
                        isAudioMode={isAudioMode}
                        onStartSTT={onStartSTT}
                        onCancelSTT={onCancelSTT}
                        onConfirmSTT={onConfirmSTT}
                        isSTTActive={isSTTActive}
                        isDictationTranscribing={isDictationTranscribing}
                    />
                </div>
            </div>
            <ChatBoxStyles />
        </div>
    );
});

ChatBoxInput.displayName = 'ChatBoxInput';

export default React.memo(ChatBoxInput, (prevProps, nextProps) => {
    return (
        // Function props that close over the active conversation MUST trigger a
        // re-render when they change, otherwise the composer keeps sending with a
        // handler captured on a previously open chat (stale conversation id and
        // stale transcript). Parents memoize these, so comparing them is cheap.
        prevProps.onSendMessage === nextProps.onSendMessage &&
        prevProps.onStopGeneration === nextProps.onStopGeneration &&
        prevProps.onFileUpload === nextProps.onFileUpload &&
        prevProps.onCancelUpload === nextProps.onCancelUpload &&
        prevProps.onRemoveUploadedFile === nextProps.onRemoveUploadedFile &&
        prevProps.onInputChange === nextProps.onInputChange &&
        prevProps.onStreamingToggle === nextProps.onStreamingToggle &&
        prevProps.inputValue === nextProps.inputValue &&
        prevProps.responseInProgress === nextProps.responseInProgress &&
        prevProps.uploading === nextProps.uploading &&
        prevProps.uploadProgress === nextProps.uploadProgress &&
        prevProps.isAudioMode === nextProps.isAudioMode &&
        prevProps.isSTTActive === nextProps.isSTTActive &&
        prevProps.isDictationTranscribing === nextProps.isDictationTranscribing &&
        prevProps.audioStatus === nextProps.audioStatus &&
        prevProps.audioTranscription === nextProps.audioTranscription &&
        prevProps.audioNotice === nextProps.audioNotice &&
        prevProps.selectedModel === nextProps.selectedModel &&
        prevProps.selectedPersonalityName === nextProps.selectedPersonalityName &&
        prevProps.streaming === nextProps.streaming &&
        prevProps.sidebarStyle === nextProps.sidebarStyle &&
        prevProps.compact === nextProps.compact &&
        prevProps.mini === nextProps.mini &&
        prevProps.hideModelSelector === nextProps.hideModelSelector &&
        prevProps.hideUpload === nextProps.hideUpload &&
        prevProps.supportsFileUpload === nextProps.supportsFileUpload &&
        // Reference equality: same-length but different files must still re-render.
        prevProps.uploadedFiles === nextProps.uploadedFiles
    );
});
