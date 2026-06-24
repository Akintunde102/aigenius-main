import { ChatMessage, ChatSession, ModelPricing } from '@/app/components/model-interface/shared/types';

// Constants
export const STORAGE_KEYS = {
    SAVED_CHATS: 'nobox_saved_chats',
    CHAT_HISTORY: 'nobox_chat_history',
    PINNED_CHATS: 'nobox_pinned_chats',
    PINNED_MODELS: 'nobox_pinned_models',
    DELETED_MODELS: 'nobox_deleted_models'
} as const;

export const CONVERSION_RATES = {
    USD_TO_NGN: 1400
} as const;

export const DEFAULT_VALUES = {
    DEFAULT_CHAT_TITLE: 'New Chat'
} as const;

// Utility functions
export function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Storage utilities
class StorageManager {
    static isAvailable(): boolean {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    }

    static getItem<T>(key: string, defaultValue: T): T {
        if (!this.isAvailable()) return defaultValue;

        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Failed to parse localStorage item for key "${key}":`, error);
            return defaultValue;
        }
    }

    static setItem<T>(key: string, value: T): boolean {
        if (!this.isAvailable()) return false;

        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Failed to save to localStorage for key "${key}":`, error);
            return false;
        }
    }

    static removeItem(key: string): boolean {
        if (!this.isAvailable()) return false;

        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove from localStorage for key "${key}":`, error);
            return false;
        }
    }
}


export interface Model {
    id: string;
    name: string;
    pricing?: ModelPricing | Record<string, string>;
}

// Saved chat helpers
export function saveChatItem(item: ChatMessage): boolean {
    const existing = StorageManager.getItem<ChatMessage[]>(STORAGE_KEYS.SAVED_CHATS, []);
    existing.push(item);
    return StorageManager.setItem(STORAGE_KEYS.SAVED_CHATS, existing);
}

export function getSavedChatItems(): ChatMessage[] {
    return StorageManager.getItem<ChatMessage[]>(STORAGE_KEYS.SAVED_CHATS, []);
}

export function removeSavedChatItem(idx: number): boolean {
    const existing = StorageManager.getItem<ChatMessage[]>(STORAGE_KEYS.SAVED_CHATS, []);
    if (idx >= 0 && idx < existing.length) {
        existing.splice(idx, 1);
        return StorageManager.setItem(STORAGE_KEYS.SAVED_CHATS, existing);
    }
    return false;
}



// Pinned and deleted models
export function getPinnedModels(): string[] {
    return StorageManager.getItem<string[]>(STORAGE_KEYS.PINNED_MODELS, []);
}

export function setPinnedModels(ids: string[]): boolean {
    return StorageManager.setItem(STORAGE_KEYS.PINNED_MODELS, ids);
}

export function getDeletedModels(): string[] {
    return StorageManager.getItem<string[]>(STORAGE_KEYS.DELETED_MODELS, []);
}

export function setDeletedModels(ids: string[]): boolean {
    return StorageManager.setItem(STORAGE_KEYS.DELETED_MODELS, ids);
}

// Chat history helpers
export function getChatHistory(): ChatSession[] {
    return StorageManager.getItem<ChatSession[]>(STORAGE_KEYS.CHAT_HISTORY, []);
}

export function saveChatHistory(sessions: ChatSession[]): boolean {
    return StorageManager.setItem(STORAGE_KEYS.CHAT_HISTORY, sessions);
}

export function getExistingChatTitle(session: ChatMessage[]): string | null {
    if (!session.length) return null;
    const history = getChatHistory();
    const firstTimestamp = session[0]?.timestamp;

    // Find session by timestamp (backward compatibility) or by assigned sessionId
    const existingSession = history.find(s => {
        // If session has an ID, use it for comparison
        if (s.id) {
            return session[0]?.sessionId === s.id;
        }
        // Fall back to timestamp comparison for older sessions
        return s.messages[0]?.timestamp === firstTimestamp;
    });

    return existingSession?.title || null;
}

export function addOrUpdateChatHistory(session: ChatMessage[], modelId: string, modelName: string): boolean {
    if (!session.length) return false;
    const history = getChatHistory();
    const firstTimestamp = session[0]?.timestamp;

    // Find existing session by ID or timestamp (for backward compatibility)
    const idx = history.findIndex(s => {
        if (s.id) {
            return session[0]?.sessionId === s.id;
        }
        return s.messages[0]?.timestamp === firstTimestamp;
    });

    if (idx !== -1) {
        const existingSession = history[idx];
        const title = modelName && modelName.trim() ? modelName : (existingSession.title || DEFAULT_VALUES.DEFAULT_CHAT_TITLE);

        // Update existing session and ensure all messages have the session ID
        const updatedMessages = session.map(msg => ({ ...msg, sessionId: existingSession.id }));
        history[idx] = { ...existingSession, title, modelId, messages: updatedMessages };
    } else {
        // Create new session with unique ID
        const sessionId = generateSessionId();
        const title = modelName && modelName.trim() ? modelName : DEFAULT_VALUES.DEFAULT_CHAT_TITLE;

        // Assign session ID to all messages
        const messagesWithId = session.map(msg => ({ ...msg, sessionId }));

        const newSession: ChatSession = { id: sessionId, title, modelId, messages: messagesWithId };
        history.push(newSession);
    }
    return saveChatHistory(history);
}

export function removeChatHistorySession(sessionIdOrTimestamp: string | number): boolean {
    const history = getChatHistory();
    const idx = history.findIndex(s => {
        // If parameter is a string, it's a session ID
        if (typeof sessionIdOrTimestamp === 'string') {
            return s.id === sessionIdOrTimestamp;
        }
        // If parameter is a number, it's a timestamp (backward compatibility)
        return s.messages[0]?.timestamp === sessionIdOrTimestamp;
    });

    if (idx !== -1) {
        history.splice(idx, 1);
        return saveChatHistory(history);
    }
    return false;
}

// Pinned chats
export function getPinnedChats(): ChatSession[] {
    return StorageManager.getItem<ChatSession[]>(STORAGE_KEYS.PINNED_CHATS, []);
}

export function savePinnedChats(sessions: ChatSession[]): boolean {
    return StorageManager.setItem(STORAGE_KEYS.PINNED_CHATS, sessions);
}

export function isSessionPinned(session: ChatSession, pinnedChats: ChatSession[]): boolean {
    return pinnedChats.some(p => p.id === session.id);
}

export function pinChatSession(session: ChatSession, pinnedChats: ChatSession[]): ChatSession[] {
    if (!isSessionPinned(session, pinnedChats)) {
        const updated = [session, ...pinnedChats];
        savePinnedChats(updated);
        return updated;
    }
    return pinnedChats;
}

export function unpinChatSession(session: ChatSession, pinnedChats: ChatSession[]): ChatSession[] {
    const updated = pinnedChats.filter(p => p.id !== session.id);
    savePinnedChats(updated);
    return updated;
}

// Formatting helpers
export function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

export function formatNaira(usd: string | number): string {
    const num = typeof usd === 'string' ? parseFloat(usd) : usd;
    if (isNaN(num)) return String(usd);
    return `₦${(num * CONVERSION_RATES.USD_TO_NGN).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Display formatting for known USD amounts (not pricing estimation). */
export function formatCost(usd: number, showNaira: boolean): string {
    if (showNaira) {
        return `₦${(usd * CONVERSION_RATES.USD_TO_NGN).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
    return `$${usd.toFixed(4)}`;
} 