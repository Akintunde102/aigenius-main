import { useCallback, useEffect, useRef } from 'react';
import type { Model } from '@/app/components/model-interface/shared/types';
import type { ChatMessage } from '@/app/components/model-interface/shared/types';
import type { AudioStatus } from './audioMode.utils';
import type { HandleSendQueueOptions } from './messageSendQueue.types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import { useMessageSendQueue } from './useMessageSendQueue';
import { useMessageSendQueueProcessor } from './useMessageSendQueueProcessor';

interface UseModelInterfaceMessageQueueParams {
    activeSessionKey: string;
    loadingMap: Record<string, boolean>;
    streamingMap: Record<string, boolean>;
    isAudioMode: boolean;
    audioStatus: AudioStatus;
    models: Model[];
    selectedModel: Model | null;
    setInput: (value: string) => void;
    handleSend: (
        content?: string,
        enableStreaming?: boolean,
        preCreatedMessage?: ChatMessage,
        chatSnapshot?: ChatMessage[],
        sendOptions?: HandleSendQueueOptions,
    ) => Promise<boolean>;
    onDraftSessionMaterializedRef: React.MutableRefObject<(realId: string) => void>;
    onClearDraftQueueRef: React.MutableRefObject<() => void>;
}

export function useModelInterfaceMessageQueue({
    activeSessionKey,
    loadingMap,
    streamingMap,
    isAudioMode,
    audioStatus,
    models,
    selectedModel,
    setInput,
    handleSend,
    onDraftSessionMaterializedRef,
    onClearDraftQueueRef,
}: UseModelInterfaceMessageQueueParams) {
    const queue = useMessageSendQueue({ activeSessionKey });

    useEffect(() => {
        onDraftSessionMaterializedRef.current = queue.migrateDraftQueueToSession;
    }, [onDraftSessionMaterializedRef, queue.migrateDraftQueueToSession]);

    useEffect(() => {
        onClearDraftQueueRef.current = () => queue.clearSessionMessageQueue(DRAFT_SESSION_KEY);
    }, [onClearDraftQueueRef, queue.clearSessionMessageQueue]);

    const handleQueueMessage = useCallback((text: string) => {
        if (!selectedModel) {
            return;
        }
        const trimmed = text.trim();
        if (!trimmed) {
            return;
        }
        queue.enqueueMessage({ text: trimmed, model: selectedModel }, activeSessionKey);
        setInput('');
    }, [activeSessionKey, queue, selectedModel, setInput]);

    const sendQueuedMessage = useCallback(async (
        text: string,
        sessionKey: string,
        model: Model,
    ) => {
        return handleSend(text, undefined, undefined, undefined, {
            targetSessionKey: sessionKey,
            modelOverride: model,
        });
    }, [handleSend]);

    useMessageSendQueueProcessor({
        queue,
        loadingMap,
        streamingMap,
        activeSessionKey,
        isAudioMode,
        audioStatus,
        models,
        selectedModel,
        sendQueuedMessage,
    });

    return {
        queuedMessages: queue.queuedMessages,
        handleQueueMessage,
        removeQueuedMessage: queue.removeQueuedMessage,
    };
}
