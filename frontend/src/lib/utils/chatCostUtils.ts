import { ChatMessage, ChatSession, Model } from '@/app/components/model-interface/shared/types';
import {
    getSavedMessageCost,
    getSavedMessageCostCredits,
    getSessionStoredTotalCost,
    getSessionStoredTotalCostCredits,
} from '@/lib/utils/messageContentUtils';

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

export function calculateMessagesCostCredits(messages: ChatMessage[]): number {
    return messages.reduce((sum, message) => {
        const saved = getSavedMessageCostCredits(message);
        return sum + (typeof saved === 'number' ? saved : 0);
    }, 0);
}

export function getSessionTotalCostCredits(session: ChatSession): number {
    const storedTotal = getSessionStoredTotalCostCredits(session);
    if (storedTotal !== null) {
        return storedTotal;
    }
    return calculateMessagesCostCredits(session.messages || []);
}
