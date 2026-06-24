import React, {
    useState,
    useMemo,
    useCallback,
    useEffect,
    useRef,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
} from 'react';
import { FiRepeat } from 'react-icons/fi';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import {
    ChatMessage as ChatMessageType,
    MessageEvent,
    Model,
    OrphanReplyTrigger,
    StickyThreadMarker,
} from '@/app/components/model-interface/shared/types';
import { buildCopyTextFromEvents } from '@/lib/utils/messageCopyText';
import { textPartToPlainString } from '@/lib/utils/messageTextUtils';
import { buildChatMessageDisplayBlocks } from './chatMessageDisplay.utils';
import {
    buildOrphanReplyAnchor,
    resolveStickyMarkerPosition,
    resolveStickyMarkerHighlightRects,
} from '../../chat/hooks/orphanNoteAnchors';
import { OrphanNoteLayer } from './OrphanNoteLayer';

// Custom hooks
import { useMessageContent, useCostCalculation, useSaveState } from '../hooks';

// Message display components - direct imports to avoid circular dependency
import { MessageHeader } from './MessageHeader';
import { AssistantStreamStatus } from './AssistantStreamStatus';
import { MessageActionsMenu } from './MessageActionsMenu';
import { CostDisplay } from './CostDisplay';
import { UsageDetailsModal } from './UsageDetailsModal';

// Message type components
import {
    ImageMessage,
    AudioMessage,
    FileMessage,
    TextMessage,
    StructuredMessage
} from '../../message-types';

// Chat feature components (thinking, tools) - direct imports to avoid circular dependency
import { ThinkingDisplay } from '../../chat/components/ThinkingDisplay';
import { ToolExecutionDisplay } from '../../chat/components/ToolExecutionDisplay';
import { ToolStreamingCard } from '../../chat/components/ToolStreamingCard';
import { ToolStreamingGroup } from '../../chat/components/ToolStreamingGroup';
import {
    clusterToolDisplayBlocks,
    type ChatMessageRenderBlock,
} from '../../chat/components/cluster-tool-display-blocks';
import type { ChatMessageDisplayBlock } from './chatMessageDisplay.utils';

interface ChatMessageProps {
    msg: ChatMessageType;
    idx: number;
    selectedModel: Model | null;
    models?: Model[];
    showCosts: boolean;
    onDelete: (idx: number) => void;
    onDeleteById?: (id: string) => void;
    onSave: (msg: ChatMessageType) => void;
    onCopy: (content: string) => void;
    onReplay: (message: ChatMessageType, idx: number) => void;
    onStartOrphanReply?: (trigger: OrphanReplyTrigger) => void;
    orphanMarkers?: StickyThreadMarker[];
    orphanMarkersHidden?: boolean;
    onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
    onToggleOrphanMarkers?: (messageId: string) => void;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    formatCost: (cost: number, showNaira: boolean) => string;
    savedChats?: ChatMessageType[];
    loading?: boolean;
    streaming?: boolean;
    assistantDisplayName?: string;
    assistantAvatarUrl?: string;
    disableOrphanThreads?: boolean;
}

// Main ChatMessage Component
export function ChatMessage({
    msg,
    idx,
    selectedModel,
    models = [],
    showCosts,
    onDelete,
    onDeleteById,
    onSave,
    onCopy,
    onReplay,
    onStartOrphanReply,
    orphanMarkers = [],
    orphanMarkersHidden = false,
    onOpenOrphanMarker,
    onToggleOrphanMarkers,
    onImagePreview,
    imagePreview,
    setImagePreview,
    formatCost,
    loading = false,
    streaming = false,
    savedChats = [],
    assistantDisplayName,
    assistantAvatarUrl,
    disableOrphanThreads = false
}: ChatMessageProps) {
    const [showUsageDetails, setShowUsageDetails] = useState(false);
    const [messageActionsMenuOpen, setMessageActionsMenuOpen] = useState(false);
    const [resolvedMarkerPositions, setResolvedMarkerPositions] = useState<Array<{
        marker: StickyThreadMarker;
        left: number;
        top: number;
        rects: Array<{ left: number; top: number; width: number; height: number }>;
    }>>([]);
    const [selectionTrigger, setSelectionTrigger] = useState<{
        left: number;
        top: number;
        isBelow?: boolean;
        selection: Selection;
    } | null>(null);
    const messageContainerRef = useRef<HTMLDivElement | null>(null);
    const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

    const isLongUserText = useMemo(() => {
        if (msg.role !== 'user' || typeof msg.content !== 'string') return false;
        const normalizedLines = msg.content.split('\n').map((line) => line.trim());
        const estimatedWrappedLines = normalizedLines.reduce((total, line) => {
            if (!line) return total + 1;
            // Approximate wraps for ~320px bubble width at 14px text.
            return total + Math.max(1, Math.ceil(line.length / 42));
        }, 0);
        return estimatedWrappedLines > 8;
    }, [msg.role, msg.content]);

    // Custom hooks - must be called before any early returns
    const messageContent = useMessageContent(msg.content);

    const cost = useCostCalculation(msg, showCosts);
    const { isSaved, justSaved, handleSave } = useSaveState(msg, savedChats, onSave);

    // Memoized values - prefer human-readable model name; resolve modelId to name when modelName missing
    const modelName = useMemo(() => {
        if (msg.modelName) return msg.modelName;
        if (msg.modelId) {
            const matched = models.find((m) => m.id === msg.modelId);
            return matched?.name ?? msg.modelId;
        }
        return msg.role === 'assistant' ? 'Model' : '';
    }, [msg.modelName, msg.modelId, msg.role, models]);

    const displayName = useMemo(() => {
        if (msg.role === 'assistant') {
            // Priority: personaName (from message) > assistantDisplayName (current personality) > modelName
            if (msg.personaName) return msg.personaName;
            if (assistantDisplayName) return assistantDisplayName;
        }
        return modelName;
    }, [msg.personaName, assistantDisplayName, modelName, msg.role]);

    /** Events in `msg.events` array order (not sorted by `order` field). */
    const displayEvents = useMemo(() => {
        if (!msg.events?.length) return [];
        return msg.events.filter(
            (e): e is MessageEvent =>
                e != null && typeof e === 'object' && 'type' in e,
        );
    }, [msg.events]);

    const displayBlocks = useMemo(
        () => buildChatMessageDisplayBlocks(displayEvents, { streaming }),
        [displayEvents, streaming],
    );

    const renderBlocks = useMemo(() => clusterToolDisplayBlocks(displayBlocks), [displayBlocks]);

    const legacyStreamingToolBlocks = useMemo((): ChatMessageRenderBlock[] => {
        const tools = msg.streaming_tools;
        if (!tools?.length) return [];
        const pseudo: ChatMessageDisplayBlock[] = tools.map((st) => ({
            type: 'tool',
            event: {
                type: 'tool',
                tool: st.tool,
                displayName: st.displayName,
                arguments: st.arguments ?? {},
                logs: st.logs,
                loading: st.loading,
                success: st.success,
                result: st.result,
                timestamp: 0,
            },
        }));
        return clusterToolDisplayBlocks(pseudo);
    }, [msg.streaming_tools]);

    // Event handlers — when `events` exists, copy the full turn (text + tools), not only `msg.content`.
    const handleCopy = useCallback(() => {
        if (displayEvents.length > 0) {
            onCopy(buildCopyTextFromEvents(displayEvents));
            return;
        }
        if (messageContent.isImageMsg) {
            onCopy(messageContent.imageUrl);
        } else if (messageContent.isFileMsg) {
            onCopy(messageContent.fileUrl);
        } else if (messageContent.isStructuredContent) {
            // Extract text content from structured content for copying
            const textContent = messageContent.structuredContent
                .filter(block => block.type === 'text' && textPartToPlainString(block.text).trim())
                .map(block => textPartToPlainString(block.text))
                .join('\n');
            onCopy(textContent);
        } else {
            onCopy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
        }
    }, [displayEvents, messageContent, msg.content, onCopy]);

    const handleReplay = useCallback(() => {
        if (msg.role === 'user') {
            onReplay(msg, idx);
        }
    }, [msg, onReplay, idx]);

    const triggerAnchoredReply = useCallback((params?: {
        clientX?: number;
        clientY?: number;
        selection?: Selection | null;
    }) => {
        if (msg.role !== 'assistant' || !messageContainerRef.current || disableOrphanThreads) {
            return;
        }

        onStartOrphanReply?.({
            message: msg,
            anchor: buildOrphanReplyAnchor({
                container: messageContainerRef.current,
                message: msg,
                clientX: params?.clientX,
                clientY: params?.clientY,
                selection: params?.selection,
            }),
        });
        setSelectionTrigger(null);
    }, [msg, onStartOrphanReply, disableOrphanThreads]);

    const handleMenuOrphanReply = useCallback(() => {
        triggerAnchoredReply();
    }, [triggerAnchoredReply]);

    const clearLongPress = useCallback(() => {
        if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current);
            longPressTimeoutRef.current = null;
        }
        longPressStartRef.current = null;
    }, []);

    const handleAssistantModifierClick = useCallback(() => {
        // Disabled Shift+Click as per user request
    }, []);

    const handlePointerDownCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (msg.role !== 'assistant' || event.pointerType !== 'touch' || disableOrphanThreads) {
            return;
        }

        const target = event.target as HTMLElement | null;
        if (target?.closest('button, a, input, textarea, [role="menu"], [role="menuitem"]')) {
            return;
        }

        clearLongPress();
        longPressStartRef.current = { x: event.clientX, y: event.clientY };
        longPressTimeoutRef.current = setTimeout(() => {
            triggerAnchoredReply({
                clientX: event.clientX,
                clientY: event.clientY,
            });
            clearLongPress();
        }, 480);
    }, [clearLongPress, msg.role, triggerAnchoredReply, disableOrphanThreads]);

    const handlePointerMoveCapture = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!longPressStartRef.current) {
            return;
        }

        const deltaX = Math.abs(event.clientX - longPressStartRef.current.x);
        const deltaY = Math.abs(event.clientY - longPressStartRef.current.y);
        if (deltaX > 10 || deltaY > 10) {
            clearLongPress();
        }
    }, [clearLongPress]);

    const handleMouseUp = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
        if (msg.role !== 'assistant' || disableOrphanThreads) return;

        // Small delay to allow selection to finalize
        setTimeout(() => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed || !selection.toString().trim()) {
                setSelectionTrigger(null);
                return;
            }

            const range = selection.getRangeAt(0);
            if (!messageContainerRef.current?.contains(range.commonAncestorContainer)) {
                setSelectionTrigger(null);
                return;
            }

            const rect = range.getBoundingClientRect();
            const containerRect = messageContainerRef.current.getBoundingClientRect();

            const isBelow = rect.top < 60; // Avoid clipping at viewport top

            setSelectionTrigger({
                left: rect.left + rect.width / 2 - containerRect.left,
                top: isBelow
                    ? rect.bottom - containerRect.top + 10
                    : rect.top - containerRect.top - 40,
                isBelow,
                selection,
            });
        }, 10);
    }, [msg.role, disableOrphanThreads]);

    useEffect(() => {
        if (disableOrphanThreads || !messageContainerRef.current || orphanMarkers.length === 0 || orphanMarkersHidden) {
            setResolvedMarkerPositions([]);
            return;
        }

        const container = messageContainerRef.current;
        const syncMarkerPositions = () => {
            setResolvedMarkerPositions(orphanMarkers.map((marker) => {
                const position = resolveStickyMarkerPosition(container, marker.anchor);
                const rects = resolveStickyMarkerHighlightRects(container, marker.anchor);
                return {
                    marker,
                    left: position.left,
                    top: position.top,
                    rects,
                };
            }));
        };

        syncMarkerPositions();

        const resizeObserver = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(() => syncMarkerPositions())
            : null;

        resizeObserver?.observe(container);
        window.addEventListener('resize', syncMarkerPositions);

        return () => {
            resizeObserver?.disconnect();
            window.removeEventListener('resize', syncMarkerPositions);
        };
    }, [orphanMarkers, orphanMarkersHidden, disableOrphanThreads]);

    useEffect(() => clearLongPress, [clearLongPress]);

    // User: bubble chrome. Assistant: flat transcript (no card). Spacing / rhythm from chat-layout.scss.
    const messageContainerClasses = useMemo(() => {
        if (msg.role === "user") {
            return [
                "relative ml-auto max-w-sm min-w-0 rounded-[22px] border px-4 py-3 text-[15px] leading-relaxed",
                "[background-color:var(--user-bubble-bg)] [border-color:var(--user-bubble-border)] [color:var(--user-bubble-fg)]",
            ].join(" ");
        }
        return "relative min-w-0 w-full px-1 py-1 text-[15px] leading-relaxed [color:var(--app-ink-900)]";
    }, [msg.role]);

    const messageStyles = useMemo(() => ({
        width: '100%',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        fontSize: '14px',
        ...(msg.role !== 'user'
            ? { maxWidth: '100%' }
            : { maxWidth: isLongUserText ? '352px' : '320px' })
    }), [msg.role, isLongUserText]);

    // Early return for empty assistant messages - after all hooks are called
    // Don't hide if there's reasoning, tool executions, active streaming tool, events, or live stream (status chip).
    if (msg.role === 'assistant' && (!msg.content || (typeof msg.content === 'string' && msg.content.trim() === ''))) {
        if (
            !streaming
            && !msg.reasoning
            && !msg.reasoning_details?.length
            && !msg.tool_executions?.length
            && !msg.streaming_tools?.length
            && !msg.events?.length
        ) {
            return null;
        }
    }

    return (
        <div
            id={`chat-message-${msg.messageId || msg.id || `ts_${msg.timestamp}`}`}
            className={`relative flex w-full ${msg.role === "user" ? "justify-end" : "justify-start md:justify-center"} ${messageActionsMenuOpen ? "z-[80]" : "z-0"}`}
        >
            <div
                className={`relative group flex items-end gap-3 ${msg.role === "user" ? "justify-end w-full" : "justify-start w-full md:max-w-[720px]"}`}
            >
                <div
                    className={`${messageContainerClasses} min-w-0`}
                    style={messageStyles}
                    ref={messageContainerRef}
                    onClickCapture={handleAssistantModifierClick}
                    onPointerDownCapture={handlePointerDownCapture}
                    onPointerMoveCapture={handlePointerMoveCapture}
                    onPointerUpCapture={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onMouseUp={handleMouseUp}
                >
                    {msg.role === "user" ? (
                        <div
                            className="group/replay absolute right-1 top-1 z-20 flex items-center justify-center p-1"
                            title="Replay message"
                        >
                            <button
                                type="button"
                                onClick={handleReplay}
                                disabled={loading || streaming}
                                tabIndex={-1}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent text-[#64748B] opacity-0 shadow-none transition-opacity duration-150 group-hover/replay:opacity-100 hover:text-[#0F172A] disabled:cursor-not-allowed group-hover/replay:disabled:opacity-40 dark:text-zinc-500 dark:hover:text-zinc-200"
                                aria-label="Replay message"
                            >
                                <FiRepeat size={14} aria-hidden />
                            </button>
                        </div>
                    ) : null}
                    <div className="relative z-10">
                        {msg.role === 'assistant' && orphanMarkers.length > 0 && !disableOrphanThreads ? (
                            <button
                                type="button"
                                onClick={() => onToggleOrphanMarkers?.(msg.messageId ?? msg.id ?? `ts_${msg.timestamp}`)}
                                className="absolute -right-1 top-7 z-20 rounded-full border border-[#D6E4F0] bg-white/95 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[#475569] shadow-sm transition hover:border-[#94A3B8] hover:text-[#0F172A] dark:border-zinc-600 dark:bg-zinc-900/95 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                                title={orphanMarkersHidden ? 'Show anchored notes on this message' : 'Hide anchored notes on this message'}
                            >
                                {orphanMarkersHidden ? `Notes ${orphanMarkers.length}` : `•${orphanMarkers.length}`}
                            </button>
                        ) : null}
                        {!orphanMarkersHidden && !disableOrphanThreads && (
                            <OrphanNoteLayer
                                resolvedMarkerPositions={resolvedMarkerPositions}
                                selectionTrigger={selectionTrigger}
                                onOpenOrphanMarker={onOpenOrphanMarker}
                                triggerAnchoredReply={triggerAnchoredReply}
                                isSelectionActive={!!selectionTrigger}
                            />
                        )}
                        <MessageHeader
                            role={msg.role}
                            displayName={displayName}
                            avatarUrl={msg.role === 'assistant' ? assistantAvatarUrl : undefined}
                            suppressAssistantHeader={msg.role === 'assistant'}
                        />
                        {/* Content wrapper: min-w-0 prevents flex blowout; tables/code handle their own overflow */}
                        <div className="min-w-0">
                            {/* Thinking stream: below model name, only while streaming and no content yet; never shown with final message */}
                            {msg.role === 'assistant' && streaming && (msg.reasoning || msg.reasoning_details) && !(typeof msg.content === 'string' && msg.content.trim()) && (
                                <ThinkingDisplay
                                    reasoning={msg.reasoning}
                                    reasoningDetails={msg.reasoning_details}
                                />
                            )}

                            {/*
                          * Event-based render (new messages).
                          * Each assistant turn carries an ordered `events` list; we render them
                          * sequentially so text → tool → text → tool interleaving is preserved.
                          * Legacy messages (no events) fall through to the old render path below.
                          */}
                            {renderBlocks.length > 0 ? (
                                <div className="flex flex-col gap-3 md:gap-4">
                                    {renderBlocks.map((block, i: number) => {
                                        if (block.type === 'text') {
                                            return (
                                                <TextMessage
                                                    key={i}
                                                    content={block.content}
                                                    streaming={streaming && block.endsWithLastTextEvent}
                                                    role={msg.role}
                                                />
                                            );
                                        }

                                        if (block.type === 'tool_cluster') {
                                            return (
                                                <div key={i} className="w-full">
                                                    <ToolStreamingGroup events={block.events} messageStreaming={streaming} />
                                                </div>
                                            );
                                        }

                                        const toolEvt = block.event;
                                        return (
                                            <div key={i} className="w-full">
                                                <ToolStreamingCard
                                                    streaming_tool={{
                                                        tool: toolEvt.tool,
                                                        displayName: toolEvt.displayName,
                                                        logs: toolEvt.logs,
                                                        loading: toolEvt.loading,
                                                        success: toolEvt.success,
                                                        arguments: toolEvt.arguments,
                                                    }}
                                                    result={toolEvt.result}
                                                    arguments={toolEvt.arguments}
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <>
                                    {/* Legacy render path — backward compat for messages without events */}
                                    {messageContent.isImageMsg ? (
                                        <ImageMessage
                                            imageUrl={messageContent.imageUrl}
                                            onImagePreview={onImagePreview}
                                            imagePreview={imagePreview}
                                            setImagePreview={setImagePreview}
                                        />
                                    ) : messageContent.isAudioMsg ? (
                                        <AudioMessage
                                            fileUrl={messageContent.fileUrl}
                                            onCopy={onCopy}
                                        />
                                    ) : messageContent.isFileMsg ? (
                                        <FileMessage
                                            fileUrl={messageContent.fileUrl}
                                            fileName={messageContent.fileName}
                                            onCopy={onCopy}
                                        />
                                    ) : messageContent.isStructuredContent ? (
                                        <StructuredMessage
                                            content={messageContent.structuredContent}
                                            onImagePreview={onImagePreview}
                                            imagePreview={imagePreview}
                                            setImagePreview={setImagePreview}
                                            streaming={streaming}
                                        />
                                    ) : typeof msg.content === 'string' ? (
                                        msg.content.trim() ? (
                                            <TextMessage
                                                content={msg.content}
                                                streaming={streaming}
                                                role={msg.role}
                                            />
                                        ) : null
                                    ) : (
                                        <JsonSyntaxBlock
                                            value={msg.content}
                                            preClassName="max-h-64 border-slate-200/80"
                                            codeClassName="text-[11px]"
                                        />
                                    )}

                                    {/* Live tool streaming (loader + logs) — legacy only */}
                                    {legacyStreamingToolBlocks.length > 0 && (
                                        <div className="mt-2 flex w-full flex-col gap-2">
                                            {legacyStreamingToolBlocks.map((block, i) => {
                                                if (block.type === 'tool_cluster') {
                                                    return (
                                                        <div key={`cluster-${i}`} className="w-full">
                                                            <ToolStreamingGroup events={block.events} messageStreaming={streaming} />
                                                        </div>
                                                    );
                                                }
                                                if (block.type !== 'tool') {
                                                    return null;
                                                }
                                                const toolEvt = block.event;
                                                return (
                                                    <div key={`${toolEvt.tool}-${i}`} className="w-full">
                                                        <ToolStreamingCard
                                                            streaming_tool={{
                                                                tool: toolEvt.tool,
                                                                displayName: toolEvt.displayName,
                                                                logs: toolEvt.logs,
                                                                loading: toolEvt.loading,
                                                                success: toolEvt.success,
                                                                arguments: toolEvt.arguments,
                                                            }}
                                                            result={toolEvt.result}
                                                            arguments={toolEvt.arguments}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Completed tool executions — legacy only */}
                                    {msg.tool_executions && msg.tool_executions.length > 0 && (
                                        <ToolExecutionDisplay tool_executions={msg.tool_executions} />
                                    )}
                                </>
                            )}
                        </div>

                        <div
                            className={
                                msg.role === "user"
                                    ? "mt-2 flex items-start justify-end gap-2"
                                    : "mt-2 flex items-start justify-between gap-2"
                            }
                        >
                            {msg.role === "assistant" ? (
                                <div className="flex shrink-0 items-center gap-2">
                                    <MessageActionsMenu
                                        align="start"
                                        msg={msg}
                                        idx={idx}
                                        isSaved={isSaved}
                                        justSaved={justSaved}
                                        loading={loading}
                                        streaming={streaming}
                                        onDelete={onDelete}
                                        onDeleteById={onDeleteById}
                                        onCopy={handleCopy}
                                        onSave={handleSave}
                                        onReplay={handleReplay}
                                        onStartOrphanReply={disableOrphanThreads ? undefined : handleMenuOrphanReply}
                                        onOpenUsageDetails={() => setShowUsageDetails(true)}
                                        onOpenChange={setMessageActionsMenuOpen}
                                    />
                                    <CostDisplay
                                        variant="costOnly"
                                        msg={msg}
                                        streaming={streaming}
                                        showCosts={showCosts}
                                        cost={cost}
                                        formatCost={formatCost}
                                    />
                                </div>
                            ) : null}
                            <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                                <div className="flex flex-wrap items-center justify-end gap-2">
                                    {msg.role === "assistant" ? (
                                        <CostDisplay
                                            variant="metaOnly"
                                            msg={msg}
                                            streaming={streaming}
                                            showCosts={showCosts}
                                            cost={cost}
                                            formatCost={formatCost}
                                            beforeTime={
                                                <span
                                                    className="inline-flex max-w-[14rem] items-center gap-1.5 truncate text-[11px] font-semibold text-slate-700"
                                                    title={displayName}
                                                >
                                                    {assistantAvatarUrl ? (
                                                        <img
                                                            src={assistantAvatarUrl}
                                                            alt=""
                                                            className="h-3.5 w-3.5 shrink-0 rounded object-cover"
                                                            width={14}
                                                            height={14}
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                    ) : null}
                                                    <span className="truncate">{displayName}</span>
                                                </span>
                                            }
                                        />
                                    ) : (
                                        <CostDisplay
                                            msg={msg}
                                            streaming={streaming}
                                            showCosts={showCosts}
                                            cost={cost}
                                            formatCost={formatCost}
                                        />
                                    )}
                                    {msg.role === "assistant" && streaming ? (
                                        <AssistantStreamStatus loading={loading} />
                                    ) : null}
                                </div>
                            </div>
                            {msg.role === "user" ? (
                                <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                    <MessageActionsMenu
                                        align="end"
                                        msg={msg}
                                        idx={idx}
                                        isSaved={isSaved}
                                        justSaved={justSaved}
                                        loading={loading}
                                        streaming={streaming}
                                        onDelete={onDelete}
                                        onDeleteById={onDeleteById}
                                        onCopy={handleCopy}
                                        onSave={handleSave}
                                        onReplay={handleReplay}
                                        onStartOrphanReply={handleMenuOrphanReply}
                                        onOpenUsageDetails={() => setShowUsageDetails(true)}
                                        onOpenChange={setMessageActionsMenuOpen}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>

            <UsageDetailsModal
                showUsageDetails={showUsageDetails}
                setShowUsageDetails={setShowUsageDetails}
                msg={msg}
                streaming={streaming}
            />
        </div>
    );
}
