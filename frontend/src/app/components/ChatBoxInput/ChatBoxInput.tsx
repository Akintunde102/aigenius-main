import React, { useRef, useImperativeHandle, forwardRef, useEffect, useCallback, useState, useMemo } from 'react';
import { FileText, Loader2, X, AlertCircle, RotateCcw } from 'lucide-react';
import { UploadProgressBar } from './UploadProgressBar';
import { ChatTextarea } from './ChatTextarea';
import { ChatControls } from './ChatControls';
import { ChatBoxInputProps } from './types';
import type { Model } from '@/app/components/model-interface/shared/types';
import ChatBoxStyles from './components/ChatBoxStyles';
import { useFileUpload, PendingFile } from './hooks/useFileUpload';
import { useInputState } from './hooks/useInputState';
import { useGlistenEffect } from './hooks/useGlistenEffect';
import { getContainerStyles } from './utils/styles';
import { ComposerMessageQueue } from './ComposerMessageQueue';
import { computeModelRequiredBalance } from '@/app/components/model-interface/features/models/utils/modelWalletAffordance.utils';

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
    onSelectModel,
    quickPickModels,
    favoritesLoaded,
    onOpenFullModelPicker,
    wallet,
    onAddCredits,
    isInsufficientCredits = false,
    placeholder = "How can I help you today?",
    responseInProgress = false,
    onStopGeneration,
    className = "",
    uploading = false,
    uploadProgress = null,
    supportsFileUpload = true,
    onAttachmentMenuRequest,
    uploadedFiles = [],
    failedUploadFiles = [],
    onRetryFailedUpload,
    onRemoveFailedUpload,
    onRemoveUploadedFile,
    inputValue: externalInputValue,
    onInputChange,
    composerSessionKey,
    commitComposerDraftForKey,
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
    audioNotice,
    onComposerKeyDown,
    composerTextareaId,
    composerRootId = 'chat-input',
    queuedMessages = [],
    onQueueMessage,
    onRemoveQueuedMessage,
}, ref) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Custom hooks
    const isPc = useIsPc();

    const handleQuickPickSelect = useCallback(
        (model: Model) => {
            onSelectModel?.(model);
            onModelChange?.(model);
        },
        [onSelectModel, onModelChange],
    );
    const glisten = useGlistenEffect();
    const { inputValue, handleInputChange, flushInputToParent } = useInputState({
        externalInputValue,
        onInputChange,
        composerSessionKey,
        commitDraftForKey: commitComposerDraftForKey,
    });

    const attachmentsDisabled = responseInProgress;

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
        disabled: attachmentsDisabled,
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

    const activePendingFiles = pendingFiles;

    const isAnyFileUploading = uploading || activePendingFiles.length > 0;
    const hasFilesButModelUnsupported = uploadedFiles.length > 0 && !supportsFileUpload;
    const sendBlocked = responseInProgress || hasFilesButModelUnsupported || isAnyFileUploading;
    const canQueueMessage = responseInProgress
        && !hasFilesButModelUnsupported
        && !isAnyFileUploading
        && uploadedFiles.length === 0
        && Boolean(onQueueMessage);

    const onQueueMessageRef = useRef(onQueueMessage);
    useEffect(() => {
        onQueueMessageRef.current = onQueueMessage;
    }, [onQueueMessage]);

    const queueCurrentInput = useCallback(() => {
        const trimmed = inputValue.trim();
        if (!trimmed || !canQueueMessage) {
            return false;
        }
        flushInputToParent();
        onQueueMessageRef.current?.(trimmed);
        handleInputChange('');
        return true;
    }, [canQueueMessage, flushInputToParent, handleInputChange, inputValue]);

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
                await Promise.resolve(
                    onSendMessageRef.current(inputValue.trim(), selectedModel),
                );
                console.log('[ChatBoxInput] onSendMessage finished');
            } else if (inputValue.trim() && canQueueMessage) {
                queueCurrentInput();
            } else {
                console.log('[ChatBoxInput] Submission blocked or empty input');
            }
        },
        [inputValue, uploadedFiles.length, sendBlocked, canQueueMessage, selectedModel, flushInputToParent, queueCurrentInput],
    );

    // PC: Enter = send, Shift+Enter = new line. Mobile: Enter and Shift+Enter = new line only (no keyboard submit).
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onComposerKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key !== 'Enter') return;
    if (!isPc) return; // Mobile: never submit via keyboard; both Enter and Shift+Enter insert newline
    if (e.shiftKey) return; // PC: Shift+Enter = new line
    if (responseInProgress) {
        if (inputValue.trim() && canQueueMessage) {
            e.preventDefault();
            queueCurrentInput();
        }
        return;
    }
    e.preventDefault();
    handleSubmit(e as any);
  }, [canQueueMessage, handleSubmit, inputValue, isPc, onComposerKeyDown, queueCurrentInput, responseInProgress]);



    const styles = getContainerStyles(sidebarStyle);
    const composerWalletMuted = isInsufficientCredits && !responseInProgress;
    const requiredWalletBalance = useMemo(
        () => computeModelRequiredBalance(selectedModel),
        [selectedModel],
    );

    const attachmentPreviews =
        uploadedFiles.length > 0 || activePendingFiles.length > 0 || failedUploadFiles.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-2 px-1">
                {uploadedFiles.map((item, idx) => {
                    const displayName = item.displayName || item.file?.name || 'attachment';
                    const ext = displayName.split('.').pop()?.toUpperCase() || '';
                    return (
                        <div
                            key={`uploaded-${idx}`}
                            className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80 dark:hover:border-slate-600"
                            title={displayName}
                        >
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                                {item.isImage ? (
                                    <img
                                        src={item.fileUrl}
                                        alt={displayName}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2">
                                        <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                                        <span className="max-w-[64px] truncate text-[9px] font-medium text-slate-600 dark:text-slate-300">
                                            {displayName}
                                        </span>
                                        {ext && (
                                            <span className="rounded bg-orange-100 px-1 py-px text-[8px] font-bold uppercase text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                                {ext}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Green checkmark badge */}
                            <span className="absolute bottom-1 left-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </span>
                            {onRemoveUploadedFile && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveUploadedFile(idx)}
                                    className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-600"
                                    title="Remove"
                                    aria-label="Remove file"
                                >
                                    <X size={8} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {failedUploadFiles.map((item) => {
                    const ext = item.file.name.split('.').pop()?.toUpperCase() || '';
                    const isImage = item.file.type.startsWith('image/');
                    const isRetrying = item.status === 'retrying';
                    const progress = isRetrying && typeof item.progress === 'number' ? item.progress : 0;
                    const radius = 14;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (progress / 100) * circumference;
                    return (
                        <div
                            key={`failed-${item.id}`}
                            className={`group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border shadow-sm ${
                                isRetrying
                                    ? 'border-sky-200 bg-slate-50 dark:border-sky-800/60 dark:bg-slate-800/80'
                                    : 'border-red-300 bg-red-50 dark:border-red-800/60 dark:bg-red-950/40'
                            }`}
                            title={isRetrying ? `Retrying upload: ${item.file.name}` : `Upload failed: ${item.file.name}`}
                        >
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                                <div className={`flex h-full w-full flex-col items-center justify-center gap-1 p-2 ${isRetrying ? 'opacity-60' : ''}`}>
                                    {isImage ? (
                                        <AlertCircle size={20} className={isRetrying ? 'text-sky-400' : 'text-red-500'} />
                                    ) : (
                                        <FileText size={20} className={isRetrying ? 'text-slate-400 dark:text-slate-500' : 'text-red-400'} />
                                    )}
                                    <span className={`max-w-[64px] truncate text-[9px] font-medium ${
                                        isRetrying ? 'text-slate-600 dark:text-slate-300' : 'text-red-700 dark:text-red-300'
                                    }`}>
                                        {item.file.name}
                                    </span>
                                    {ext && (
                                        <span className={`rounded px-1 py-px text-[8px] font-bold uppercase ${
                                            isRetrying
                                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                        }`}>
                                            {ext}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {isRetrying ? (
                                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[2px] dark:bg-black/50">
                                    {progress > 0 ? (
                                        <>
                                            <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                                                <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20" />
                                                <circle
                                                    cx="18" cy="18" r={radius}
                                                    fill="none" stroke="currentColor" strokeWidth="2.5"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={strokeDashoffset}
                                                    strokeLinecap="round"
                                                    className="text-sky-400 transition-all duration-300"
                                                />
                                            </svg>
                                            <span className="absolute text-[9px] font-bold text-white">
                                                {Math.round(progress)}%
                                            </span>
                                        </>
                                    ) : (
                                        <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                                    )}
                                </div>
                            ) : null}
                            {!isRetrying && onRetryFailedUpload && (
                                <button
                                    type="button"
                                    onClick={() => onRetryFailedUpload(item.id)}
                                    className="absolute bottom-1 left-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                                    title="Retry upload"
                                    aria-label={`Retry upload for ${item.file.name}`}
                                >
                                    <RotateCcw size={10} />
                                </button>
                            )}
                            {onRemoveFailedUpload && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveFailedUpload(item.id)}
                                    className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-600"
                                    title={isRetrying ? 'Cancel upload' : 'Remove'}
                                    aria-label={isRetrying ? `Cancel upload for ${item.file.name}` : 'Remove failed upload'}
                                >
                                    <X size={8} />
                                </button>
                            )}
                        </div>
                    );
                })}

                {activePendingFiles.map((item: PendingFile) => {
                    const progress = item.status === 'uploading' && uploadProgress !== null ? uploadProgress : 0;
                    const radius = 14;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (progress / 100) * circumference;
                    const ext = item.file.name.split('.').pop()?.toUpperCase() || '';
                    return (
                        <div
                            key={item.id}
                            className="group relative flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-sky-200 bg-slate-50 shadow-sm dark:border-sky-800/60 dark:bg-slate-800/80"
                            title={item.file.name}
                        >
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                                {item.isImage && item.previewUrl ? (
                                    <img
                                        src={item.previewUrl}
                                        alt={item.file.name}
                                        className="h-full w-full object-cover opacity-60"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 opacity-60">
                                        <FileText size={20} className="text-slate-400 dark:text-slate-500" />
                                        <span className="max-w-[64px] truncate text-[9px] font-medium text-slate-600 dark:text-slate-300">
                                            {item.file.name}
                                        </span>
                                        {ext && (
                                            <span className="rounded bg-sky-100 px-1 py-px text-[8px] font-bold uppercase text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                                {ext}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Upload progress overlay — circular ring for uploading, spinner for dispatched */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-[2px] dark:bg-black/50">
                                {item.status === 'uploading' && uploadProgress !== null && uploadProgress > 0 ? (
                                    <>
                                        <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                                            <circle cx="18" cy="18" r={radius} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/20" />
                                            <circle
                                                cx="18" cy="18" r={radius}
                                                fill="none" stroke="currentColor" strokeWidth="2.5"
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                                className="text-sky-400 transition-all duration-300"
                                            />
                                        </svg>
                                        <span className="absolute text-[9px] font-bold text-white">
                                            {Math.round(progress)}%
                                        </span>
                                    </>
                                ) : (
                                    <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => removePendingFile(item.id)}
                                className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-white shadow-sm transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-red-600"
                                title={item.status === 'uploading' && uploading ? 'Cancel upload' : 'Remove'}
                                aria-label={item.status === 'uploading' && uploading ? `Cancel upload for ${item.file.name}` : 'Remove file'}
                            >
                                <X size={8} />
                            </button>
                        </div>
                    );
                })}
            </div>
        ) : null;

    return (
        <div id={composerRootId} className={`w-full mx-auto ${className}`} style={{ position: 'relative', zIndex: 10 }}>
            {/* Per-file circular progress is shown on individual cards */}

            {/* Warning banner when files are attached but model doesn't support them */}
            {hasFilesButModelUnsupported && (
                <div className="mx-1 mb-2 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
                    <svg className="h-4 w-4 shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
                    <span>This model doesn&apos;t support file attachments. Remove the attached files or switch to a compatible model to send your message.</span>
                </div>
            )}

            {attachmentPreviews}

            <div
                className={`${styles.container} ${composerWalletMuted ? "chat-composer--wallet-muted" : ""}`}
            >
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
                            disabled={attachmentsDisabled}
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
                            uploading={isAnyFileUploading}
                            responseInProgress={responseInProgress}
                            onStopGeneration={onStopGeneration}
                            textareaRef={textareaRef}
                            sidebarStyle={sidebarStyle}
                            onFocus={onFocus}
                            onBlur={onBlur}
                            onSubmit={handleSubmit}
                            sendBlocked={sendBlocked}
                            submitTitle={
                                isAnyFileUploading
                                    ? 'Please wait for file uploads to complete'
                                    : hasFilesButModelUnsupported
                                        ? 'The selected model does not support file attachments'
                                        : isPc
                                            ? 'Send message (Enter). New line: Shift+Enter'
                                            : 'Send message'
                            }
                            hasUploadedFiles={uploadedFiles.length > 0}
                            mini={mini}
                            textareaId={composerTextareaId}
                            canQueueMessage={canQueueMessage}
                            actionSlot={(
                                <ComposerMessageQueue
                                    queuedMessages={queuedMessages}
                                    onRemoveQueuedMessage={onRemoveQueuedMessage ?? (() => undefined)}
                                    mini={mini}
                                />
                            )}
                        />
                    </div>

                    <ChatControls
                        disabled={attachmentsDisabled}
                        modelSelectorDisabled={false}
                        uploading={isAnyFileUploading}
                        supportsFileUpload={supportsFileUpload && !hideUpload}
                        selectedModel={selectedModel}
                        onModelNameClick={onModelNameClick}
                        onSelectModel={handleQuickPickSelect}
                        quickPickModels={quickPickModels}
                        favoritesLoaded={favoritesLoaded}
                        onOpenFullModelPicker={onOpenFullModelPicker}
                        wallet={wallet}
                        onAddCredits={onAddCredits}
                        isInsufficientCredits={isInsufficientCredits}
                        requiredWalletBalance={requiredWalletBalance}
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
        prevProps.onRetryFailedUpload === nextProps.onRetryFailedUpload &&
        prevProps.onRemoveFailedUpload === nextProps.onRemoveFailedUpload &&
        prevProps.onInputChange === nextProps.onInputChange &&
        prevProps.composerSessionKey === nextProps.composerSessionKey &&
        prevProps.commitComposerDraftForKey === nextProps.commitComposerDraftForKey &&
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
        prevProps.selectedModel?.id === nextProps.selectedModel?.id &&
        prevProps.selectedPersonalityName === nextProps.selectedPersonalityName &&
        prevProps.streaming === nextProps.streaming &&
        prevProps.onSelectModel === nextProps.onSelectModel &&
        prevProps.onModelNameClick === nextProps.onModelNameClick &&
        prevProps.onOpenFullModelPicker === nextProps.onOpenFullModelPicker &&
        prevProps.wallet === nextProps.wallet &&
        prevProps.onAddCredits === nextProps.onAddCredits &&
        prevProps.isInsufficientCredits === nextProps.isInsufficientCredits &&
        prevProps.favoritesLoaded === nextProps.favoritesLoaded &&
        prevProps.quickPickModels === nextProps.quickPickModels &&
        prevProps.sidebarStyle === nextProps.sidebarStyle &&
        prevProps.compact === nextProps.compact &&
        prevProps.mini === nextProps.mini &&
        prevProps.hideModelSelector === nextProps.hideModelSelector &&
        prevProps.hideUpload === nextProps.hideUpload &&
        prevProps.supportsFileUpload === nextProps.supportsFileUpload &&
        prevProps.uploadedFiles === nextProps.uploadedFiles &&
        prevProps.failedUploadFiles === nextProps.failedUploadFiles
    );
});
