import React, { useState, useMemo, useCallback } from 'react';
import { JsonSyntaxBlock } from '@/app/components/JsonSyntaxBlock';
import {
    ChatMessage as ChatMessageType,
    MessageEvent,
    Model,
} from '@/app/components/model-interface/shared/types';
import { ToolStreamingCard } from '@/app/components/model-interface/features/chat/components/ToolStreamingCard';
import { ToolStreamingGroup } from '@/app/components/model-interface/features/chat/components/ToolStreamingGroup';
import { ReasoningGroup } from '@/app/components/model-interface/features/chat/components/ReasoningGroup';
import { clusterToolDisplayBlocks } from '@/app/components/model-interface/features/chat/components/cluster-tool-display-blocks';
import { buildAssistantRenderSegments } from '@/app/components/model-interface/features/chat/components/assistant-turn-summary.utils';
import { AssistantWorkSummary } from '@/app/components/model-interface/features/chat/components/AssistantWorkSummary';
import { buildChatMessageDisplayBlocks } from '@/app/components/model-interface/features/messages/components/chatMessageDisplay.utils';
import { enrichEventsWithLegacyThinking } from '@/app/components/model-interface/features/chat/utils/thinkingEvent.utils';
import { buildCopyTextFromEvents } from '@/lib/utils/messageCopyText';

// Custom hooks
import { useMessageContent, useCostCalculation, useSaveState } from '@/app/(views)/published-conversations/hooks';

// Components
import {
    MessageHeader,
    ImageMessage,
    ImageWithTextMessage,
    AudioMessage,
    FileMessage,
    TextMessage,
    ActionIcons,
    CostDisplay,
    UsageDetailsModal
} from './';

interface ChatMessageProps {
    msg: ChatMessageType;
    idx: number;
    selectedModel: Model | null;
    models?: Model[];
    showCosts: boolean;
    onSave: (msg: ChatMessageType) => void;
    onCopy: (content: string) => void;
    onReplay: (message: ChatMessageType, idx: number) => void;
    onImagePreview: (url: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    formatCost: (cost: number, showNaira: boolean) => string;
    savedChats?: ChatMessageType[];
    loading?: boolean;
    streaming?: boolean;
}

// Main ChatMessage Component
export function ChatMessage({
    msg,
    idx,
    selectedModel,
    models = [],
    showCosts,
    onSave,
    onCopy,
    onReplay,
    onImagePreview,
    imagePreview,
    setImagePreview,
    formatCost,
    loading = false,
    streaming = false,
    savedChats = []
}: ChatMessageProps) {
    const [showUsageDetails, setShowUsageDetails] = useState(false);

    // Custom hooks - must be called before any early returns
    const messageContent = useMessageContent(msg.content);
    const cost = useCostCalculation(msg, showCosts);
    const { isSaved, justSaved, handleSave } = useSaveState(msg, savedChats, onSave);

    // Memoized values - prefer model name; resolve modelId to name when modelName missing
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
            // Priority: personaName (from message) > modelName
            if (msg.personaName) return msg.personaName;
        }
        return modelName;
    }, [msg.personaName, modelName, msg.role]);

    const displayEvents = useMemo(() => {
        if (!msg.events?.length) {
            return enrichEventsWithLegacyThinking([], msg);
        }
        const filtered = msg.events.filter(
            (e): e is MessageEvent => e != null && typeof e === 'object' && 'type' in e,
        );
        return enrichEventsWithLegacyThinking(filtered, msg);
    }, [msg]);

    const displayBlocks = useMemo(
        () => buildChatMessageDisplayBlocks(displayEvents, { streaming }),
        [displayEvents, streaming],
    );

    const renderBlocks = useMemo(() => clusterToolDisplayBlocks(displayBlocks), [displayBlocks]);

    const renderSegments = useMemo(
        () => buildAssistantRenderSegments(renderBlocks, streaming),
        [renderBlocks, streaming],
    );

    // Event handlers
    const handleCopy = useCallback(() => {
        if (displayEvents.length > 0) {
            onCopy(buildCopyTextFromEvents(displayEvents));
            return;
        }
        if (messageContent.isImageMsg) {
            if (messageContent.imageText) {
                // Copy both text and image URL
                onCopy(`${messageContent.imageText}\n\nImage: ${messageContent.imageUrl}`);
            } else {
                onCopy(messageContent.imageUrl);
            }
        } else if (messageContent.isFileMsg) {
            onCopy(messageContent.fileUrl);
        } else {
            onCopy(typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content));
        }
    }, [displayEvents, messageContent, msg.content, onCopy]);

    const handleReplay = useCallback(() => {
        if (msg.role === 'user') {
            // Pass the full message to preserve structured content (text + images + files)
            onReplay(msg, idx);
        }
    }, [msg, onReplay, idx]);

    // Opaque bubbles on the dark PublicPageShell; avoid md:bg-transparent (poor contrast on public bg).
    const messageContainerClasses = useMemo(() => {
        if (msg.role === "user") {
            return "relative rounded-3xl px-4 py-2 text-sm transition-all duration-200 bg-blue-100 text-blue-900 max-w-sm ml-auto";
        }
        return [
            "relative min-w-0 w-full max-w-[85%] text-sm text-zinc-100 transition-all duration-200",
            "rounded-3xl px-4 py-2 bg-zinc-800 border border-zinc-700 mr-auto",
        ].join(" ");
    }, [msg.role]);

    const messageStyles = useMemo(() => ({
        width: '100%',
        position: 'relative' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        fontSize: '14px',
        ...(msg.role === 'user' ? { maxWidth: '320px' } : {}),
    }), [msg.role]);

    // Early return for empty assistant messages - after all hooks are called
    if (msg.role === 'assistant' && (!msg.content || (typeof msg.content === 'string' && msg.content.trim() === ''))) {
        if (
            !streaming
            && !displayEvents.some((e) => e.type === 'thinking')
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
            className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            style={{ marginBottom: "0.5rem" }}
        >
            <div className={`relative group flex items-end gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}>
                <div className={messageContainerClasses} style={messageStyles}>
                    <MessageHeader
                        role={msg.role}
                        modelName={displayName}
                        suppressAssistantHeader={msg.role === 'assistant'}
                    />

                    {/* Chat content — event-based assistant turns match main chat */}
                    {msg.role === 'assistant' && renderSegments.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            {renderSegments.map((segment, i) => {
                                if (segment.type === 'work_summary') {
                                    return (
                                        <div key={`work-summary-${i}`} className="w-full">
                                            <AssistantWorkSummary items={segment.items} />
                                        </div>
                                    );
                                }

                                const block = segment.block;
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
                                if (block.type === 'thinking') {
                                    return (
                                        <div key={i} className="w-full">
                                            <ReasoningGroup
                                                event={block.event}
                                                messageStreaming={streaming}
                                            />
                                        </div>
                                    );
                                }
                                if (block.type === 'tool_cluster') {
                                    return (
                                        <div key={i} className="w-full">
                                            <ToolStreamingGroup events={block.events} messageStreaming={streaming} />
                                        </div>
                                    );
                                }
                                if (block.type !== 'tool') {
                                    return null;
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
                    ) : messageContent.isImageMsg ? (
                        messageContent.imageText ? (
                            <ImageWithTextMessage
                                imageUrl={messageContent.imageUrl}
                                imageText={messageContent.imageText}
                                onImagePreview={onImagePreview}
                                imagePreview={imagePreview}
                                setImagePreview={setImagePreview}
                            />
                        ) : (
                            <ImageMessage
                                imageUrl={messageContent.imageUrl}
                                onImagePreview={onImagePreview}
                                imagePreview={imagePreview}
                                setImagePreview={setImagePreview}
                            />
                        )
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
                    ) : typeof msg.content === 'string' ? (
                        <TextMessage
                            content={msg.content}
                            streaming={streaming}
                            role={msg.role}
                        />
                    ) : (
                        <JsonSyntaxBlock
                            value={msg.content}
                            preClassName="max-h-64 border-zinc-600/80"
                            codeClassName="text-[11px]"
                        />
                    )}

                    {/* Footer: Action icons and metadata */}
                    <div
                        className={`mt-3 pt-2 border-t ${msg.role === "user" ? "border-blue-200/50" : "border-zinc-600"}`}
                    >
                        <div
                            className={`flex items-center justify-between text-[12px] mb-2 w-full ${msg.role === "user" ? "text-gray-600" : "text-zinc-400"}`}
                        >
                            <ActionIcons
                                msg={msg}
                                isSaved={isSaved}
                                justSaved={justSaved}
                                loading={loading}
                                streaming={streaming}
                                onCopy={handleCopy}
                                onSave={handleSave}
                                onReplay={handleReplay}
                                setShowUsageDetails={setShowUsageDetails}
                            />
                            <CostDisplay
                                msg={msg}
                                streaming={streaming}
                                showCosts={showCosts}
                                cost={cost}
                                formatCost={formatCost}
                                assistantFooterLabel={msg.role === 'assistant' ? displayName : undefined}
                            />
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
