import { useCallback, useEffect, useRef } from 'react';
import type { Model } from '@/app/components/model-interface/shared/types';
import type { AudioStatus } from './audioMode.utils';
import type { MessageSendQueueApi } from './useMessageSendQueue';

interface UseMessageSendQueueProcessorParams {
    queue: MessageSendQueueApi;
    loadingMap: Record<string, boolean>;
    streamingMap: Record<string, boolean>;
    activeSessionKey: string;
    isAudioMode: boolean;
    audioStatus: AudioStatus;
    models: Model[];
    selectedModel: Model | null;
    sendQueuedMessage: (
        text: string,
        sessionKey: string,
        model: Model,
    ) => Promise<boolean>;
}

function isSessionBusy(
    sessionKey: string,
    loadingMap: Record<string, boolean>,
    streamingMap: Record<string, boolean>,
    activeSessionKey: string,
    isAudioMode: boolean,
    audioStatus: AudioStatus,
): boolean {
    if (loadingMap[sessionKey] || streamingMap[sessionKey]) {
        return true;
    }

    if (sessionKey === activeSessionKey && isAudioMode && audioStatus === 'speaking') {
        return true;
    }

    return false;
}

export function useMessageSendQueueProcessor({
    queue,
    loadingMap,
    streamingMap,
    activeSessionKey,
    isAudioMode,
    audioStatus,
    models,
    selectedModel,
    sendQueuedMessage,
}: UseMessageSendQueueProcessorParams) {
    const processingSessionsRef = useRef<Set<string>>(new Set());

    const resolveQueuedModel = useCallback((modelId: string): Model | null => {
        return models.find((model) => model.id === modelId) ?? selectedModel;
    }, [models, selectedModel]);

    const processSessionQueue = useCallback(async (sessionKey: string) => {
        if (processingSessionsRef.current.has(sessionKey)) {
            return;
        }

        if (isSessionBusy(sessionKey, loadingMap, streamingMap, activeSessionKey, isAudioMode, audioStatus)) {
            return;
        }

        const next = queue.peekQueuedMessage(sessionKey);
        if (!next) {
            return;
        }

        const model = resolveQueuedModel(next.modelId);
        if (!model) {
            return;
        }

        processingSessionsRef.current.add(sessionKey);
        const taken = queue.takeQueuedMessage(sessionKey);
        if (!taken) {
            processingSessionsRef.current.delete(sessionKey);
            return;
        }

        try {
            const sent = await sendQueuedMessage(taken.text, sessionKey, model);
            if (sent === false) {
                queue.restoreQueuedMessage(sessionKey, taken);
            }
        } catch {
            queue.restoreQueuedMessage(sessionKey, taken);
        } finally {
            processingSessionsRef.current.delete(sessionKey);
        }
    }, [
        activeSessionKey,
        audioStatus,
        isAudioMode,
        loadingMap,
        queue,
        resolveQueuedModel,
        sendQueuedMessage,
        streamingMap,
    ]);

    useEffect(() => {
        const sessionKeys = queue.getSessionKeysWithQueue();
        for (const sessionKey of sessionKeys) {
            void processSessionQueue(sessionKey);
        }
    }, [
        loadingMap,
        streamingMap,
        activeSessionKey,
        isAudioMode,
        audioStatus,
        queue,
        processSessionQueue,
        queue.queueMap,
    ]);
}
