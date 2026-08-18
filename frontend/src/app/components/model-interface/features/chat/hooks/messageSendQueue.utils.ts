import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import type { EnqueueComposerMessageInput, MessageSendQueueMap, QueuedComposerMessage } from './messageSendQueue.types';

export function createQueuedComposerMessage(
    input: EnqueueComposerMessageInput,
): QueuedComposerMessage {
    return {
        id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        text: input.text.trim(),
        modelId: input.model.id,
        modelName: input.model.name || input.model.id,
        createdAt: Date.now(),
    };
}

export function migrateMessageSendQueueMap(
    map: MessageSendQueueMap,
    realSessionId: string,
): MessageSendQueueMap {
    const draftQueue = map[DRAFT_SESSION_KEY];
    if (!draftQueue?.length || (map[realSessionId]?.length ?? 0) > 0) {
        return map;
    }

    return {
        ...map,
        [realSessionId]: draftQueue,
        [DRAFT_SESSION_KEY]: [],
    };
}

export function clearSessionQueue(
    map: MessageSendQueueMap,
    sessionKey: string,
): MessageSendQueueMap {
    if (!map[sessionKey]?.length) {
        return map;
    }
    return {
        ...map,
        [sessionKey]: [],
    };
}

export function removeQueuedMessageById(
    map: MessageSendQueueMap,
    sessionKey: string,
    messageId: string,
): MessageSendQueueMap {
    const queue = map[sessionKey];
    if (!queue?.length) {
        return map;
    }

    const nextQueue = queue.filter((item) => item.id !== messageId);
    if (nextQueue.length === queue.length) {
        return map;
    }

    return {
        ...map,
        [sessionKey]: nextQueue,
    };
}

export function shiftQueuedMessage(
    map: MessageSendQueueMap,
    sessionKey: string,
): { map: MessageSendQueueMap; message: QueuedComposerMessage | null } {
    const queue = map[sessionKey];
    if (!queue?.length) {
        return { map, message: null };
    }

    const [message, ...rest] = queue;
    return {
        map: {
            ...map,
            [sessionKey]: rest,
        },
        message,
    };
}

export function unshiftQueuedMessage(
    map: MessageSendQueueMap,
    sessionKey: string,
    message: QueuedComposerMessage,
): MessageSendQueueMap {
    const queue = map[sessionKey] ?? [];
    return {
        ...map,
        [sessionKey]: [message, ...queue],
    };
}
