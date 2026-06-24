import React, { useCallback, memo } from 'react';
import {
    ChatMessage as ChatMessageType,
    Model,
    OrphanReplyTrigger,
    StickyThreadMarker,
} from '@/app/components/model-interface/shared/types';
import { ChatMessage } from './ChatMessage';
import { TimeDivider } from '../../chat/components';
import { formatCost } from '@/lib/utils/modelInterfaceUtils';

export interface ChatMessageWrapperProps {
    msg: ChatMessageType;
    idx: number;
    displayIdx: number;
    prevVisibleMsg: ChatMessageType | undefined;
    isLastVisibleMessage: boolean;
    selectedModel: Model | null;
    models: Model[];
    showCosts: boolean;
    showNaira: boolean;
    onDeleteMessage: (idx: number) => void;
    onDeleteMessageById?: (id: string) => void;
    onSaveMessage: (msg: ChatMessageType) => void;
    onReplayMessage: (message: ChatMessageType, idx: number) => void;
    onStartOrphanReply?: (trigger: OrphanReplyTrigger) => void;
    orphanMarkers?: StickyThreadMarker[];
    orphanMarkersHidden?: boolean;
    onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
    onToggleOrphanMarkers?: (messageId: string) => void;
    onCopy: (content: string) => void;
    imagePreview: string | null;
    setImagePreview: (url: string | null) => void;
    loading: boolean;
    streaming: boolean;
    selectedPersonalityName?: string;
    selectedPersonalityIconUrl?: string;
    disableOrphanThreads?: boolean;
}

function ChatMessageWrapperInner({
    msg,
    idx,
    displayIdx,
    prevVisibleMsg,
    isLastVisibleMessage,
    selectedModel,
    models,
    showCosts,
    showNaira,
    onDeleteMessage,
    onDeleteMessageById,
    onSaveMessage,
    onReplayMessage,
    onStartOrphanReply,
    orphanMarkers,
    orphanMarkersHidden,
    onOpenOrphanMarker,
    onToggleOrphanMarkers,
    onCopy,
    imagePreview,
    setImagePreview,
    loading,
    streaming,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    disableOrphanThreads = false,
}: ChatMessageWrapperProps) {
    const shouldShowTimeDivider =
        displayIdx > 0 &&
        prevVisibleMsg !== undefined &&
        msg.timestamp - prevVisibleMsg.timestamp > 10 * 60 * 1000;

    const formatCostCb = useCallback(
        (cost: number) => formatCost(cost, showNaira),
        [showNaira],
    );

    const onReplayCb = useCallback(
        (message: ChatMessageType) => onReplayMessage(message, idx),
        [onReplayMessage, idx],
    );

    const onImagePreviewNoop = useCallback(() => {
        /* Preview is driven via setImagePreview on message blocks */
    }, []);

    return (
        <div data-chat-message-index={idx}>
            {shouldShowTimeDivider && <TimeDivider timestamp={msg.timestamp} />}
            <ChatMessage
                msg={msg}
                idx={idx}
                selectedModel={selectedModel}
                models={models}
                showCosts={showCosts}
                onDelete={onDeleteMessage}
                onDeleteById={onDeleteMessageById}
                onSave={onSaveMessage}
                onCopy={onCopy}
                onReplay={onReplayCb}
                onStartOrphanReply={onStartOrphanReply}
                orphanMarkers={orphanMarkers}
                orphanMarkersHidden={orphanMarkersHidden}
                onOpenOrphanMarker={onOpenOrphanMarker}
                onToggleOrphanMarkers={onToggleOrphanMarkers}
                onImagePreview={onImagePreviewNoop}
                imagePreview={imagePreview}
                setImagePreview={setImagePreview}
                formatCost={formatCostCb}
                loading={loading}
                streaming={streaming && isLastVisibleMessage}
                assistantDisplayName={msg.role === 'assistant' && !msg.personaName ? (selectedPersonalityName || undefined) : undefined}
                assistantAvatarUrl={msg.role === 'assistant' ? selectedPersonalityIconUrl : undefined}
                disableOrphanThreads={disableOrphanThreads}
            />
        </div>
    );
}

function wrapperPropsEqual(
    prev: ChatMessageWrapperProps,
    next: ChatMessageWrapperProps,
): boolean {
    return (
        prev.msg === next.msg
        && prev.idx === next.idx
        && prev.displayIdx === next.displayIdx
        && prev.prevVisibleMsg === next.prevVisibleMsg
        && prev.isLastVisibleMessage === next.isLastVisibleMessage
        && prev.selectedModel === next.selectedModel
        && prev.models === next.models
        && prev.showCosts === next.showCosts
        && prev.showNaira === next.showNaira
        && prev.orphanMarkers === next.orphanMarkers
        && prev.orphanMarkersHidden === next.orphanMarkersHidden
        && prev.imagePreview === next.imagePreview
        && prev.loading === next.loading
        && prev.streaming === next.streaming
        && prev.selectedPersonalityName === next.selectedPersonalityName
        && prev.selectedPersonalityIconUrl === next.selectedPersonalityIconUrl
        && prev.disableOrphanThreads === next.disableOrphanThreads
    );
}

export const ChatMessageWrapper = memo(ChatMessageWrapperInner, wrapperPropsEqual);
