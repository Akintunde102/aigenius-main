import { useCallback, useMemo, useRef, useState } from 'react';
import type { Model } from '@/app/components/model-interface/shared/types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import type { EnqueueComposerMessageInput, MessageSendQueueMap, QueuedComposerMessage } from './messageSendQueue.types';
import {
    clearSessionQueue,
    createQueuedComposerMessage,
    migrateMessageSendQueueMap,
    removeQueuedMessageById,
    shiftQueuedMessage,
    unshiftQueuedMessage,
} from './messageSendQueue.utils';

interface UseMessageSendQueueParams {
    activeSessionKey: string;
}

export function useMessageSendQueue({ activeSessionKey }: UseMessageSendQueueParams) {
    const [queueMap, setQueueMap] = useState<MessageSendQueueMap>({});
    const queueMapRef = useRef(queueMap);
    queueMapRef.current = queueMap;

    const queuedMessages = useMemo(
        () => queueMap[activeSessionKey] ?? [],
        [queueMap, activeSessionKey],
    );

    const enqueueMessage = useCallback((input: EnqueueComposerMessageInput, sessionKey = activeSessionKey) => {
        const trimmed = input.text.trim();
        if (!trimmed) {
            return null;
        }

        const message = createQueuedComposerMessage(input);
        setQueueMap((prev) => ({
            ...prev,
            [sessionKey]: [...(prev[sessionKey] ?? []), message],
        }));
        return message;
    }, [activeSessionKey]);

    const removeQueuedMessage = useCallback((messageId: string, sessionKey = activeSessionKey) => {
        setQueueMap((prev) => removeQueuedMessageById(prev, sessionKey, messageId));
    }, [activeSessionKey]);

    const clearSessionMessageQueue = useCallback((sessionKey = activeSessionKey) => {
        setQueueMap((prev) => clearSessionQueue(prev, sessionKey));
    }, [activeSessionKey]);

    const migrateDraftQueueToSession = useCallback((realSessionId: string) => {
        setQueueMap((prev) => migrateMessageSendQueueMap(prev, realSessionId));
    }, []);

    const peekQueuedMessage = useCallback((sessionKey: string): QueuedComposerMessage | null => {
        return queueMapRef.current[sessionKey]?.[0] ?? null;
    }, []);

    const takeQueuedMessage = useCallback((sessionKey: string): QueuedComposerMessage | null => {
        let taken: QueuedComposerMessage | null = null;
        setQueueMap((prev) => {
            const result = shiftQueuedMessage(prev, sessionKey);
            taken = result.message;
            return result.map;
        });
        return taken;
    }, []);

    const restoreQueuedMessage = useCallback((sessionKey: string, message: QueuedComposerMessage) => {
        setQueueMap((prev) => unshiftQueuedMessage(prev, sessionKey, message));
    }, []);

    const getQueuedCount = useCallback((sessionKey: string) => {
        return queueMapRef.current[sessionKey]?.length ?? 0;
    }, []);

    const getSessionKeysWithQueue = useCallback(() => {
        return Object.keys(queueMapRef.current).filter(
            (sessionKey) => (queueMapRef.current[sessionKey]?.length ?? 0) > 0,
        );
    }, []);

    return {
        queueMap,
        queuedMessages,
        enqueueMessage,
        removeQueuedMessage,
        clearSessionMessageQueue,
        migrateDraftQueueToSession,
        peekQueuedMessage,
        takeQueuedMessage,
        restoreQueuedMessage,
        getQueuedCount,
        getSessionKeysWithQueue,
        DRAFT_SESSION_KEY,
    };
}

export type MessageSendQueueApi = ReturnType<typeof useMessageSendQueue>;
