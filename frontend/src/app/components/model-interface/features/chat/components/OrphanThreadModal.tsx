import React from 'react';
import { ChevronDown, Trash2, Minus } from 'lucide-react';
import { ChatAreaVirtualizedList } from './ChatAreaVirtualizedList';
import { ChatBoxInput } from '@/app/components/ChatBoxInput';
import { OrphanTetherLayer } from './OrphanTetherLayer';
import { Model, ChatMessage, StickyThreadMarker } from '@/app/components/model-interface/shared/types';

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
}) => {
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
                // Fix #3: Improved portal check. If click is inside a portal but NOT inside the side thread modal, ignore it.
                const target = e.target as HTMLElement;
                const isPortal = target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content]');
                const isInsideThisModal = target.closest('.side-thread-modal-content');
                
                if (isPortal && !isInsideThisModal) {
                    return;
                }
                
                // Also ignore if clicking on something that is inside the modal but portaled (unlikely for mousedown but safe)
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
                    className={`side-thread-modal-content pointer-events-auto fixed flex flex-col rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[#0F172A] dark:text-slate-200 shadow-[0_24px_60px_rgba(0,0,0,0.18)] w-[552px] max-w-[calc(100vw-24px)] ${
                        activeMarker.messages.length > 0 ? 'h-[531px]' : 'h-[450px]'
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
                    {/* Drag Handle / Header - Slimmer with contextual focus */}
                    <div 
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        className={`relative flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 px-4 py-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} select-none active:cursor-grabbing rounded-t-[24px]`}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            {/* Dot navigation (only if not a highlight thread) */}
                            {!activeMarker.anchor.anchorText && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const element = document.querySelector(`[data-orphan-marker-id="${activeMarker.markerId}"]`) as HTMLElement;
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // Fix #2: Visual Ping
                                            element.classList.add('animate-bounce');
                                            setTimeout(() => element.classList.remove('animate-bounce'), 1000);
                                        } else {
                                            const msg = document.getElementById(`chat-message-${activeMarker.parentMessageId}`);
                                            if (msg) {
                                                msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                msg.classList.add('source-ping-effect');
                                                setTimeout(() => msg.classList.remove('source-ping-effect'), 2000);
                                            }
                                        }
                                    }}
                                    className="relative flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/30 transition hover:bg-blue-100 dark:hover:bg-blue-900/50"
                                    title="Focus anchored dot"
                                >
                                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 dark:bg-blue-500 opacity-20" />
                                    <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-500 shadow-[0_0_8px_rgba(37,99,235,0.4)] dark:shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                                </button>
                            )}
                            
                            {/* Text navigation (only if a highlight thread) */}
                            {activeMarker.anchor.anchorText && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const element = document.querySelector(`[data-orphan-highlight-id="${activeMarker.markerId}"]`) as HTMLElement;
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            // Fix #2: Visual Ping
                                            element.style.backgroundColor = 'rgba(250, 204, 21, 0.6)';
                                            setTimeout(() => { element.style.backgroundColor = ''; }, 1500);
                                        } else {
                                            const msg = document.getElementById(`chat-message-${activeMarker.parentMessageId}`);
                                            if (msg) {
                                                msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                msg.classList.add('source-ping-effect');
                                                setTimeout(() => msg.classList.remove('source-ping-effect'), 2000);
                                            }
                                        }
                                    }}
                                    className="min-w-0 truncate text-[11px] font-medium text-slate-500 dark:text-slate-400 italic hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
                                    title="Take me back to highlight"
                                >
                                    {`"${activeMarker.anchor.anchorText}"`}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => void deleteMarker(activeMarker)}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                                title="Discard side thread"
                            >
                                <Trash2 size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={closeActiveMarker}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
                                aria-label="Minimize side thread"
                                title="Minimize"
                            >
                                <Minus size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Message Area Reusing ChatAreaVirtualizedList */}
                    <div className="flex min-h-0 flex-1 flex-col bg-transparent px-2">
                        {/* Context Chip - Fix #1: Visibility of context */}
                        {activeMarker.anchor.anchorText && (
                            <div className="mx-2 mt-3 flex items-center gap-2 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 px-3 py-2 border border-blue-100/50 dark:border-blue-800/50">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <div className="text-[11px] font-medium text-blue-700 dark:text-blue-300 truncate">
                                    Referencing: <span className="italic">{`"${activeMarker.anchor.anchorText}"`}</span>
                                </div>
                            </div>
                        )}
                        
                        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 chat-scrollbar">
                            {activeMarker.messages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500">
                                    <div className="mb-2 text-2xl">✨</div>
                                    <div className="text-sm font-medium dark:text-slate-400">New Side Thread</div>
                                    <div className="text-xs opacity-70">Ask a question about this selection.</div>
                                </div>
                            )}
                            <ChatAreaVirtualizedList
                                chat={activeMarker.messages}
                                selectedModel={selectedModel}
                                models={models}
                                showCosts={showCosts}
                                showNaira={showNaira}
                                loading={false} // Managed by streaming
                                imagePreview={null}
                                setImagePreview={() => {}}
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
