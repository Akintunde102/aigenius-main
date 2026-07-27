import React, { forwardRef, useRef, useImperativeHandle, useState, useCallback } from 'react';
import { ArrowUp, Loader2, Maximize2, Mic, Phone, FolderCode, MessageSquare } from 'lucide-react';
import { AudioModeOverlay } from './AudioModeOverlay';
import { ChatArea } from './ChatArea';
import { ChatAreaVirtualizedList } from './ChatAreaVirtualizedList';
import { ChatBoxInput } from '@/app/components/ChatBoxInput';
import { OrphanThreadModal } from './OrphanThreadModal';
import { Model, ChatMessage, PendingOrphanReply } from '@/app/components/model-interface/shared/types';
import { useBrowserDetection } from '@/app/components/model-interface/shared/hooks';
import { useMobileKeyboard, useMobileLayout } from '@/app/components/model-interface/features/mobile/hooks';
import { useAnchoredOrphanNotes } from '../hooks/useAnchoredOrphanNotes';
import type { AudioStatus } from '../hooks/audioMode.utils';
import { useCodeProjects } from '@/lib/hooks/useCodeProjects';
import { getChatProjectScopeId } from '@/lib/code-projects/chat-project-scope';

import styles from './ChatContainer.module.scss';

import type { UploadedFileEntry } from '@/app/components/model-interface/ModelInterface.helpers';
import { FEATURE_FLAGS } from '@/lib/config/features';

interface ChatContainerProps {
    chat: ChatMessage[];
    chatHistory?: any[];
    selectedModel: Model | null;
    models: Model[];
    showCosts: boolean;
    showNaira: boolean;
    showTyping: boolean;
    loading: boolean;
    imagePreview: string | null;
    setImagePreview: (preview: string | null) => void;
    chatEndRef: React.RefObject<HTMLDivElement>;
    chatAreaRef: React.RefObject<HTMLDivElement>;
    showScrollToBottom: boolean;
    onDeleteMessage: (idx: number) => void;
    onDeleteMessageById?: (id: string) => void;
    onSaveMessage: (msg: ChatMessage) => void;
    onReplayMessage: (message: ChatMessage, idx: number) => void;
    currentSessionId: string | null;
    onSendMessage: (
        message: string,
        model: Model,
    ) => boolean | void | Promise<boolean | void>;
    onFileUpload: (file: File) => void;
    onAttachmentMenuRequest?: () => void;
    uploading: boolean;
    uploadProgress: number | null;
    supportsImageUpload: boolean;
    uploadedFiles: UploadedFileEntry[];
    onRemoveUploadedFile?: (index: number) => void;
    onModelNameClick: () => void;
    onCancelUpload?: () => void;
    setIsTyping?: (typing: boolean) => void; // <-- new prop
    streaming?: boolean; // in-progress state
    streamingEnabled?: boolean; // user preference
    onStreamingToggle?: (enabled: boolean) => void;
    // Personalities
    selectedPersonalityName?: string;
    onPersonalityClick?: () => void;
    selectedPersonalityIconUrl?: string;
    onClearPersonality?: () => void;
    pendingOrphanReply?: PendingOrphanReply | null;
    onCancelOrphanReply?: () => void;
    onStopGeneration?: () => void;
    /** When true (desktop collapsed sidebar), constrain and center the chat column. */
    desktopConversationCentered?: boolean;

    setError?: (error: string | ((prev: string) => string)) => void;
    setWallet?: (wallet: number | null | ((prev: number | null) => number | null)) => void;
    onInsufficientFunds?: () => void;
    requestModelPick?: () => Promise<{ id: string; name?: string } | null>;
    // Audio props
    onAudioModeToggle?: (enabled: boolean) => void;
    isAudioMode?: boolean;
    onStartSTT?: () => void;
    onCancelSTT?: () => void;
    onConfirmSTT?: () => void;
    isSTTActive?: boolean;
    isDictationTranscribing?: boolean;
    audioTranscription?: string;
    audioStatus?: AudioStatus;
    audioNotice?: string;
    audioVolume?: number;
    /** Controlled textarea value — set by STT to inject transcribed text. */
    inputValue?: string;
    onInputChange?: (value: string) => void;
    onMiniModeToggle?: () => void;
    isMiniMode?: boolean;
    analyzer?: AnalyserNode | null;
}

export interface ChatContainerHandle {
    focusInput: () => void;
    queueFiles: (files: File[]) => void;
    openLocalFilePicker: () => void;
}

const ChatContainer = forwardRef<ChatContainerHandle, ChatContainerProps & { onShowSavedChats?: () => void, sidebarStyle?: boolean }>(({
    chat,
    chatHistory = [],
    selectedModel,
    models,
    showCosts,
    showNaira,
    showTyping,
    loading,
    imagePreview,
    setImagePreview,
    chatEndRef,
    chatAreaRef,
    showScrollToBottom,
    onDeleteMessage,
    onDeleteMessageById,
    onSaveMessage,
    onReplayMessage,
    currentSessionId,
    onSendMessage,
    onFileUpload,
    onAttachmentMenuRequest,
    uploading,
    uploadProgress,
    supportsImageUpload,
    uploadedFiles,
    onRemoveUploadedFile,
    onModelNameClick,
    onCancelUpload,
    onShowSavedChats,
    sidebarStyle = false,
    setIsTyping,
    streaming,
    streamingEnabled,
    onStreamingToggle,
    selectedPersonalityName,
    onPersonalityClick,
    selectedPersonalityIconUrl,
    onClearPersonality,
    pendingOrphanReply,
    onCancelOrphanReply,
    onStopGeneration,
    desktopConversationCentered = false,
    setError,
    setWallet,
    onInsufficientFunds,
    requestModelPick,
    onAudioModeToggle,
    isAudioMode,
    onStartSTT,
    onCancelSTT,
    onConfirmSTT,
    isSTTActive,
    isDictationTranscribing = false,
    audioTranscription,
    audioStatus = 'listening',
    audioNotice = "",
    audioVolume = 0,
    inputValue,
    onInputChange,
    onMiniModeToggle,
    isMiniMode,
    analyzer = null,
}, ref) => {
    const inputRef = useRef<any>(null);
    const orphanInputRef = useRef<HTMLTextAreaElement>(null);

    const { projects } = useCodeProjects();
    const activeSession = chatHistory.find((s) => s.id === currentSessionId);
    const projectId = activeSession?.codeProjectId || getChatProjectScopeId();
    const currentProject = projects.find((p) => p.id === projectId) ?? null;


    const streamVisibleInChat =
        streaming || (Boolean(isAudioMode) && audioStatus === 'speaking');
    const responseInProgress = loading || streamVisibleInChat;
    const {
        markersByMessageId,
        hiddenMessageIds,
        activeMarker,
        activeModalPosition,
        activeInput,
        setActiveInput,
        isSending: isSendingStickyNote,
        openMarker,
        closeActiveMarker,
        toggleMessageVisibility,
        createOrphanNoteFromTrigger,
        deleteMarker,
        sendActiveMarkerMessage,
        stopActiveMarkerMessage,
        setActiveMarkerModelId,
        dragOffset,
        setDragOffset,
    } = useAnchoredOrphanNotes({
        currentSessionId,
        selectedModel,
        models,
        setError,
        setWallet,
        onInsufficientFunds,
    });

    const [markerViewportPos, setMarkerViewportPos] = useState<{ x: number, y: number } | null>(null);

    // Track the active marker's viewport position for the tethering string
    React.useEffect(() => {
        if (!activeMarker) {
            setMarkerViewportPos(null);
            return;
        }

        const updateMarkerPos = () => {
            const markerEl = document.querySelector(`[data-orphan-marker-id="${activeMarker.markerId}"]`);
            if (markerEl) {
                const rect = markerEl.getBoundingClientRect();
                setMarkerViewportPos({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                });
            }
        };

        updateMarkerPos();

        /*
        // Update on scroll and resize
        window.addEventListener('scroll', updateMarkerPos, true);
        window.addEventListener('resize', updateMarkerPos);

        const interval = setInterval(updateMarkerPos, 100); // Polling for dynamic changes (like streaming content shifts)
        */

        return () => {
            /*
            window.removeEventListener('scroll', updateMarkerPos, true);
            window.removeEventListener('resize', updateMarkerPos);
            clearInterval(interval);
            */
        };
    }, [activeMarker]);

    React.useLayoutEffect(() => {
        const target = orphanInputRef.current;
        if (!target) return;

        target.style.height = 'auto';
        if (activeInput) {
            const newHeight = Math.min(target.scrollHeight, 120);
            target.style.height = `${newHeight}px`;
            target.style.overflowY = target.scrollHeight > 120 ? 'auto' : 'hidden';
        } else {
            target.style.overflowY = 'hidden';
        }
    }, [activeInput]);

    // Use our new hooks for cleaner separation of concerns
    const { isMobile, browserInfo } = useBrowserDetection();
    const { keyboardHeight, isKeyboardOpen } = useMobileKeyboard({ isMobile, chatAreaRef });
    const {
        containerStyle,
        chatAreaStyle,
        inputContainerStyle,
        spacerStyle,
        isFullScreenMobile
    } = useMobileLayout({
        isMobile,
        keyboardHeight,
        browserInfo
    });

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialOffsetRef = useRef({ x: 0, y: 0 });

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) return;
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialOffsetRef.current = dragOffset;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }, [dragOffset]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        setDragOffset({
            x: initialOffsetRef.current.x + dx,
            y: initialOffsetRef.current.y + dy,
        });
    }, [isDragging, setDragOffset]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useImperativeHandle(ref, () => ({
        focusInput: () => {
            inputRef.current?.focusInput();
        },
        queueFiles: (files: File[]) => {
            inputRef.current?.queueFiles?.(files);
        },
        openLocalFilePicker: () => {
            inputRef.current?.openLocalFilePicker?.();
        },
    }));

    const mainAreaClass = [
        styles.chatMainArea,
        isFullScreenMobile ? styles.fullScreenMobile : '',
        'flex flex-col h-full chat-main-area',
        desktopConversationCentered ? 'w-full max-w-4xl mx-auto' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={`${styles.chatContainer} flex-1 flex flex-col min-w-0 h-full`}
            style={containerStyle}
        >
            <div
                className={mainAreaClass}
            >
                {/* Scope Header - Rendered only for project-scoped chats */}
                {currentProject ? (
                    <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-100 bg-white/60 dark:border-zinc-800/80 dark:bg-zinc-950/60 px-6 py-4 backdrop-blur-md z-30">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex-shrink-0">
                                <FolderCode size={18} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold text-slate-900 dark:text-zinc-50 truncate">
                                        {currentProject.name}
                                    </span>
                                    <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-700 bg-emerald-50 rounded-full dark:text-emerald-400 dark:bg-emerald-950/60 uppercase">
                                        Project
                                    </span>
                                </div>
                                {currentProject.rootPath && (
                                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono truncate mt-0.5" title={currentProject.rootPath}>
                                        {currentProject.rootPath}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}

                <div
                    className={`
                        ${styles.chatAreaContainer}
                         ${isKeyboardOpen ? styles.keyboardOpen : ''}
                         ${browserInfo?.isIOS && isKeyboardOpen ? styles.keyboardOpenIos : ''}
                         ${browserInfo?.isAndroid && isKeyboardOpen ? styles.keyboardOpenAndroid : ''} chat-area-container flex-1 pt-2`}
                    style={chatAreaStyle}
                >
                    <ChatArea
                        chat={chat}
                        selectedModel={selectedModel}
                        models={models}
                        showCosts={showCosts}
                        showNaira={showNaira}
                        showTyping={showTyping}
                        loading={loading}
                        imagePreview={imagePreview}
                        setImagePreview={setImagePreview}
                        chatEndRef={chatEndRef}
                        chatAreaRef={chatAreaRef}
                        onDeleteMessage={onDeleteMessage}
                        onDeleteMessageById={onDeleteMessageById}
                        onSaveMessage={onSaveMessage}
                        onReplayMessage={onReplayMessage}
                        onStartOrphanReply={createOrphanNoteFromTrigger}
                        orphanMarkersByMessageId={markersByMessageId}
                        hiddenMarkerMessageIds={hiddenMessageIds}
                        onOpenOrphanMarker={openMarker}
                        onToggleOrphanMarkers={toggleMessageVisibility}
                        streaming={streamVisibleInChat}
                        selectedPersonalityName={selectedPersonalityName}
                        selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                    />
                </div>
                <div
                    className={`${styles.chatInputContainer} ${isKeyboardOpen ? styles.keyboardOpen : ''} ${browserInfo?.isIOS && isKeyboardOpen ? styles.keyboardOpenIos : ''} ${browserInfo?.isAndroid && isKeyboardOpen ? styles.keyboardOpenAndroid : ''} chat-input-container mx-auto w-full max-w-3xl flex-shrink-0 px-4 pb-5 pt-2`}
                    style={inputContainerStyle}
                >
                    {pendingOrphanReply ? (
                        <div className="mb-3 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                                        Side Thread
                                    </div>
                                    <div className="mt-1 font-medium">
                                        Replying from {pendingOrphanReply.parentConversationTitle || 'the current conversation'}
                                    </div>
                                    {pendingOrphanReply.anchor.messageExcerpt ? (
                                        <div className="mt-1 truncate text-emerald-800/80">
                                            {`"${pendingOrphanReply.anchor.messageExcerpt}"`}
                                        </div>
                                    ) : null}
                                </div>
                                <button
                                    type="button"
                                    onClick={onCancelOrphanReply}
                                    className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : null}
                    <ChatBoxInput
                        ref={inputRef}
                        onSendMessage={onSendMessage}
                        onFileUpload={onFileUpload}
                        onAttachmentMenuRequest={onAttachmentMenuRequest}
                        models={models}
                        selectedModel={selectedModel!}
                        onModelChange={() => { }}
                        placeholder="Type..."
                        responseInProgress={responseInProgress}
                        onStopGeneration={onStopGeneration}
                        uploading={uploading}
                        uploadProgress={uploadProgress}
                        supportsFileUpload={supportsImageUpload}
                        uploadedFiles={uploadedFiles}
                        onRemoveUploadedFile={onRemoveUploadedFile}
                        onCancelUpload={onCancelUpload}
                        className="p-0"
                        onModelNameClick={onModelNameClick}
                        selectedPersonalityName={selectedPersonalityName}
                        onPersonalityClick={onPersonalityClick}
                        selectedPersonalityIconUrl={selectedPersonalityIconUrl}
                        onClearPersonality={onClearPersonality}
                        onShowSavedChats={onShowSavedChats}
                        streaming={streamingEnabled}
                        onStreamingToggle={onStreamingToggle}
                        onAudioModeToggle={onAudioModeToggle}
                        isAudioMode={isAudioMode}
                        onStartSTT={onStartSTT}
                        onCancelSTT={onCancelSTT}
                        onConfirmSTT={onConfirmSTT}
                        isSTTActive={isSTTActive}
                        isDictationTranscribing={isDictationTranscribing}
                        audioStatus={audioStatus}
                        audioTranscription={audioTranscription}
                        audioNotice={audioNotice}
                        inputValue={inputValue}
                        onInputChange={onInputChange}
                        onFocus={() => {
                            // On mobile, use smooth scrollIntoView for better UX
                            if (isMobile) {
                                // Smooth scroll the input into view - works cross-browser
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        const inputElement = inputRef.current;
                                        // Get the actual DOM element if it's a ref wrapper
                                        const domElement = inputElement.querySelector ? inputElement : inputElement.current;

                                        if (domElement && typeof domElement.scrollIntoView === 'function') {
                                            domElement.scrollIntoView({
                                                behavior: 'smooth',
                                                block: 'end', // Align to bottom of viewport
                                                inline: 'nearest'
                                            });
                                        }
                                    }
                                }, 100); // Reduced delay for better responsiveness
                            }
                        }}
                        onBlur={() => {
                            // Handle blur events for mobile keyboard management
                            if (isMobile) {
                                // Small delay to allow keyboard to close naturally
                                setTimeout(() => {
                                    // The keyboard height will be handled by the viewport listener
                                }, 100);
                            }
                        }}
                    />
                </div>
            </div>
            {activeMarker && activeModalPosition ? (
                <OrphanThreadModal
                    activeMarker={activeMarker}
                    activeModalPosition={activeModalPosition}
                    activeInput={activeInput}
                    setActiveInput={setActiveInput}
                    isSending={isSendingStickyNote}
                    sendActiveMarkerMessage={sendActiveMarkerMessage}
                    onStopGeneration={stopActiveMarkerMessage}
                    deleteMarker={deleteMarker}
                    closeActiveMarker={closeActiveMarker}
                    setActiveMarkerModelId={setActiveMarkerModelId}
                    selectedModel={selectedModel}
                    models={models}
                    showCosts={showCosts}
                    showNaira={showNaira}
                    onSaveMessage={onSaveMessage}
                    requestModelPick={requestModelPick}
                    isDragging={isDragging}
                    handlePointerDown={handlePointerDown}
                    handlePointerMove={handlePointerMove}
                    handlePointerUp={handlePointerUp}
                    markerViewportPos={markerViewportPos}
                    onModelNameClick={onModelNameClick}
                />
            ) : null}

            {FEATURE_FLAGS.AUDIO_CONVERSATION && isAudioMode && onAudioModeToggle && (
                <AudioModeOverlay
                    onExit={() => onAudioModeToggle(false)}
                    status={audioStatus}
                    transcription={audioTranscription}
                    notice={audioNotice}
                    volume={audioVolume}
                    analyzer={analyzer}
                    isMini={isMiniMode}
                    onToggleMini={onMiniModeToggle}
                />
            )}
        </div>
    );
});
ChatContainer.displayName = "ChatContainer";
export default ChatContainer;
