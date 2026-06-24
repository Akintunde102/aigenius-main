import { ChatMessage, ChatSession, Model } from '@/app/components/model-interface/shared/types';
import { getSavedMessageCost, getSessionStoredTotalCost } from '@/lib/utils/messageContentUtils';

/**
 * Sum of per-message USD costs when the backend persisted `cost` on messages.
 * Does not estimate missing costs.
 */
export function calculateMessagesCost(messages: ChatMessage[], _models: Model[]): number {
    return messages.reduce((sum, message) => {
        const savedCost = getSavedMessageCost(message);
        return sum + (typeof savedCost === 'number' ? savedCost : 0);
    }, 0);
}

export function getSessionTotalCost(session: ChatSession, models: Model[]): number {
    const storedTotal = getSessionStoredTotalCost(session);
    if (storedTotal !== null) {
        return storedTotal;
    }
    return calculateMessagesCost(session.messages || [], models);
}
