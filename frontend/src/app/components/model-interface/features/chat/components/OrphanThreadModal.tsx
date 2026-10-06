import React from 'react';
import { ChevronDown, Trash2, Minus, X, Quote, MessageSquarePlus, CornerDownRight } from 'lucide-react';
import { ChatAreaVirtualizedList } from './ChatAreaVirtualizedList';
import { ChatBoxInput } from '@/app/components/ChatBoxInput';
import { OrphanTetherLayer } from './OrphanTetherLayer';
import { Model, ChatMessage, StickyThreadMarker } from '@/app/components/model-interface/shared/types';
import { useLanguage } from '@/lib/providers/LanguageProvider';

interface OrphanThreadModalProps {
    activeMarker: any; // StickyThreadRecord
    activeModalPosition: { left: number; top: number };
    activeInput: string;
    setActiveInput: (val: string) => void;
    isSending: boolean;
    sendActiveMarkerMessage: () => void;
    deleteMarker: (marker: StickyThreadMarker) => void | Promise<void>;
    closeActiveMarker: () => void;
    setActiveMarkerModelId: (id: string) => void;
    selectedModel: Model | null;
    models: Model[];
    showCosts: boolean;
    showNaira: boolean;
    onSaveMessage: (msg: ChatMessage) => void;
    requestModelPick?: () => Promise<{ id: string; name?: string } | null>;
    isDragging: boolean;
    handlePointerDown: (e: React.PointerEvent) => void;
    handlePointerMove: (e: React.PointerEvent) => void;
    handlePointerUp: (e: React.PointerEvent) => void;
    markerViewportPos: { x: number; y: number } | null;
    onModelNameClick: () => void;
    onStopGeneration: () => void;
    imagePreview: import('@/app/components/model-interface/features/message-types/components/ImagePreviewActionsContext').ImagePreviewOpenTarget | null;
    setImagePreview: (url: import('@/app/components/model-interface/features/message-types/components/ImagePreviewActionsContext').ImagePreviewOpenTarget | null) => void;
}

export const OrphanThreadModal: React.FC<OrphanThreadModalProps> = React.memo(({
    activeMarker,
    activeModalPosition,
    activeInput,
    setActiveInput,
    isSending,
    sendActiveMarkerMessage,
    onStopGeneration,
    deleteMarker,
    closeActiveMarker,
    setActiveMarkerModelId,
    selectedModel,
    models,
    showCosts,
    showNaira,
    onSaveMessage,
    requestModelPick,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    markerViewportPos,
    onModelNameClick,
    imagePreview,
    setImagePreview,
}) => {
    const { t } = useLanguage();
    const modalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        // Clear window selection to prevent redundant triggers in the main chat
        window.getSelection()?.removeAllRanges();
    }, []);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeActiveMarker();
            }
        };

        const handleMouseDownOutside = (e: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                // If click is inside a portal but NOT inside the side thread modal, ignore it.
                const target = e.target as HTMLElement;
                const isPortal = target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content]');
                const isInsideThisModal = target.closest('.side-thread-modal-content');
                
                if (isPortal && !isInsideThisModal) {
                    return;
                }
                
                if (isInsideThisModal) {
                    return;
                }

                closeActiveMarker();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('mousedown', handleMouseDownOutside, true);

        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('mousedown', handleMouseDownOutside, true);
        };
    }, [closeActiveMarker]);

    return (
        <>
            <OrphanTetherLayer
                startX={markerViewportPos?.x ?? activeMarker.anchor.tapClientX}
                startY={markerViewportPos?.y ?? activeMarker.anchor.tapClientY}
                endX={activeModalPosition.left}
                endY={activeModalPosition.top + 20}
                isVisible={true}
                isDragging={isDragging}
            />
            <div
                className="pointer-events-none fixed inset-0 z-[120]"
                aria-live="polite"
            >
                <div
                    ref={modalRef}
                    className={`side-thread-modal-content pointer-events-auto fixed flex flex-col rounded-[22px] border border-slate-200/80 bg-white/95 text-[#0F172A] shadow-[0_24px_64px_rgba(15,23,42,0.16)] backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-100 w-[552px] max-w-[calc(100vw-24px)] ${
                        activeMarker.messages.length > 0 ? 'h-[531px]' : 'h-[460px]'
                    }`}
                    style={{
                        left: `${activeModalPosition.left}px`,
                        top: `${activeModalPosition.top}px`,
                        maxHeight: 'min(90vh, 1260px)',
                        minWidth: '320px',
                        minHeight: '300px',
                        animation: 'side-thread-ooze 240ms cubic-bezier(0.16, 1, 0.3, 1)',
                        resize: 'both',
                        overflow: 'hidden',
                    }}
                >
                    {/* Drag Handle / Header */}
                    <div 
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`relative flex flex-col border-b border-slate-100 bg-slate-50/80 px-4 pt-1.5 pb-2.5 dark:border-slate-800 dark:bg-slate-800/40 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none active:cursor-grabbing rounded-t-[22px]`}
                    >
                        {/* Drag indicator pill */}
                        <div className="h-1 w-8 rounded-full bg-slate-300/80 dark:bg-slate-600/70 mx-auto mb-2" />

                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                                    <MessageSquarePlus className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-semibold tracking-tight text-slate-800 dark:text-slate-200">
                                    {t('orphanThread.title', 'Side Thread')}
                                </span>

                                {/* Context navigation link (if highlight thread) */}
                                {activeMarker.anchor.anchorText && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const element = document.querySelector(`[data-orphan-highlight-id="${activeMarker.markerId}"]`) as HTMLElement;
                                            if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                element.style.backgroundColor = 'rgba(56, 189, 248, 0.3)';
                                                setTimeout(() => { element.style.backgroundColor = ''; }, 1200);
                                            } else {
                                                const msg = document.getElementById(`chat-message-${activeMarker.parentMessageId}`);
                                                if (msg) {
                                                    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    msg.classList.add('source-ping-effect');
                                                    setTimeout(() => msg.classList.remove('source-ping-effect'), 2000);
                                                }
                                            }
                                        }}
                                        className="min-w-0 max-w-[210px] truncate text-[11px] font-medium text-slate-400 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 transition-colors text-left flex items-center gap-1"
                                        title={t('orphanThread.jumpToSourceTitle', 'Jump back to source text in the main conversation')}
                                    >
                                        <CornerDownRight className="h-3 w-3 shrink-0" />
                                        <span className="truncate italic">
                                            &ldquo;{activeMarker.anchor.anchorText}&rdquo;
                                        </span>
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => void deleteMarker(activeMarker)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                                    title={t('orphanThread.discardAria', 'Discard side thread')}
                                    aria-label={t('orphanThread.discardAria', 'Discard side thread')}
                                >
                                    <Trash2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={closeActiveMarker}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    aria-label="Close side thread"
                                    title="Close"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Message Area */}
                    <div className="flex min-h-0 flex-1 flex-col bg-transparent px-2">
                        {/* Context Quote Banner */}
                        {activeMarker.anchor.anchorText && (
                            <div className="mx-2 mt-3 flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/70 p-2.5 text-xs text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
                                <Quote className="h-3.5 w-3.5 mt-0.5 shrink-0 text-sky-500 dark:text-sky-400" />
                                <div className="min-w-0 flex-1">
                                    <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                        {t('orphanThread.referencedContext', 'Referenced Context')}
                                    </div>
                                    <div className="line-clamp-2 text-[12px] italic text-slate-700 dark:text-slate-300">
                                        &ldquo;{activeMarker.anchor.anchorText}&rdquo;
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 chat-scrollbar">
                            {activeMarker.messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/60 dark:bg-sky-950/50 dark:text-sky-400 dark:ring-sky-800/50">
                                        <MessageSquarePlus className="h-5 w-5" />
                                    </div>
                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        Ask further
                                    </div>
                                    <div className="mt-1 max-w-[260px] text-xs text-slate-500 dark:text-slate-400">
                                        Ask questions or explore ideas anchored to this excerpt without interrupting the main chat.
                                    </div>
                                </div>
                            )}
                            <ChatAreaVirtualizedList
                                chat={activeMarker.messages}
                                selectedModel={selectedModel}
                                models={models}
                                showCosts={showCosts}
                                showNaira={showNaira}
                                loading={false} // Managed by streaming
                                imagePreview={imagePreview}
                                setImagePreview={setImagePreview}
                                onDeleteMessage={() => {}}
                                onSaveMessage={onSaveMessage}
                                onReplayMessage={() => {}}
                                streaming={isSending}
                                disableOrphanThreads={true}
                            />
                        </div>
                        
                        {/* Input Area Reusing ChatBoxInput logic but with compact styling */}
                        <div className="border-t border-slate-100 dark:border-slate-800 p-4">
                            <ChatBoxInput
                                inputValue={activeInput}
                                onInputChange={(val) => setActiveInput(val)}
                                onSendMessage={() => {
                                    void sendActiveMarkerMessage();
                                    return true;
                                }}
                                models={models}
                                selectedModel={models.find(m => m.id === activeMarker.modelId) || selectedModel!}
                                placeholder="Explore this context..."
                                responseInProgress={isSending}
                                onStopGeneration={onStopGeneration}
                                className="border-none shadow-none p-0 bg-transparent"
                                // Enable the UI for the modal
                                hideModelSelector={false}
                                onModelChange={(model) => setActiveMarkerModelId(model.id)}
                                onModelNameClick={async () => {
                                    if (requestModelPick) {
                                        const picked = await requestModelPick();
                                        if (picked) {
                                            setActiveMarkerModelId(picked.id);
                                        }
                                    } else {
                                        onModelNameClick();
                                    }
                                }}
                                hideUpload={true}
                                compact={true}
                                mini={true}
                            />
                        </div>
                    </div>
                </div>
                <style jsx>{`
                    @keyframes side-thread-ooze {
                        0% {
                            opacity: 0;
                            transform: translateY(8px);
                        }
                        100% {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    :global(.source-ping-effect) {
                        animation: source-ping-highlight 2s ease-out;
                    }
                    @keyframes source-ping-highlight {
                        0% { background-color: rgba(59, 130, 246, 0.2); }
                        50% { background-color: rgba(59, 130, 246, 0.1); }
                        100% { background-color: transparent; }
                    }
                    .chat-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .chat-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(var(--scrollbar-thumb-color, 0,0,0), 0.1);
                        border-radius: 10px;
                    }
                    :global(.dark) .chat-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                    }
                `}</style>
            </div>
        </>
    );
});

OrphanThreadModal.displayName = 'OrphanThreadModal';
