/**
 * Chat persistence bridge: gateway API + IndexedDB mirror for offline-ish sidebar data.
 * Typical flow: try network first, refresh IndexedDB on success, fall back to local rows on failure.
 */

import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import {
    saveChatItem as dbSaveChatItem,
    getSavedChatItems as dbGetSavedChatItems,
    removeSavedChatItem as dbRemoveSavedChatItem,
    getSavedFullChatSessions as dbGetSavedFullChatSessions,
    removeSavedFullChatSession as dbRemoveSavedFullChatSession,
    addOrUpdateChatHistory as dbAddOrUpdateChatHistory,
    getChatHistory as dbGetChatHistory,
    removeChatHistorySessionById as dbRemoveChatHistorySessionById,
    getPinnedChats as dbGetPinnedChats,
    getAllChatResources as dbGetAllChatResources,
    pinChatSession as dbPinChatSession,
    unpinChatSession as dbUnpinChatSession,
    getUserChatStats as dbGetUserChatStats,
    removeSavedChatItemById as dbRemoveSavedChatItemById,
    type UserChatStats,
} from '@/lib/calls/model-chat-conversation';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import {
    storeSavedChats,
    getSavedChats,
    storeSavedFullChats,
    getSavedFullChats,
    storeChatHistory,
    getChatHistory as getLocalChatHistory,
    storePinnedChats,
    getPinnedChats as getLocalPinnedChats,
    needsSync
} from './chatStorage';
import { normalizeChatMessages, normalizeSessionMessages } from './messageContentUtils';

/** Some legacy rows used `_id` instead of `id`. */
type SessionRow = ChatSession & { _id?: string };

const USD_TO_NGN = 1400;

function sessionRowId(session: SessionRow): string | undefined {
    return session.id ?? session._id;
}

export function upsertChatHistorySession(
    sessions: ChatSession[],
    incoming: ChatSession,
): ChatSession[] {
    const normalizedIncoming = normalizeSessionMessages(incoming) as ChatSession;
    const incomingId = sessionRowId(normalizedIncoming as SessionRow);
    const rest = sessions.filter((session) => sessionRowId(session as SessionRow) !== incomingId);
    return [normalizedIncoming, ...rest];
}

export function mergeChatHistorySessions(
    backendSessions: ChatSession[],
    previousSessions: ChatSession[],
): ChatSession[] {
    return previousSessions.reduce<ChatSession[]>(
        (merged, session) => {
            const sessionId = sessionRowId(session as SessionRow);
            if (!sessionId || merged.some((item) => sessionRowId(item as SessionRow) === sessionId)) {
                return merged;
            }
            return [...merged, normalizeSessionMessages(session) as ChatSession];
        },
        backendSessions.map((session) => normalizeSessionMessages(session) as ChatSession),
    );
}

async function refreshSavedSnippetsFromServer(): Promise<ChatMessage[]> {
    const backendChats = await dbGetSavedChatItems();
    await storeSavedChats(backendChats);
    return backendChats;
}

export async function saveChatItem(item: ChatMessage): Promise<void> {
    await dbSaveChatItem(item);
    const currentSavedChats = await getSavedChats();
    await storeSavedChats([...currentSavedChats, item]);
}

export async function getSavedChatItems(): Promise<ChatMessage[]> {
    try {
        return await refreshSavedSnippetsFromServer();
    } catch (error) {
        console.warn('Failed to fetch saved chats from backend, falling back to local data:', error);
        try {
            return await getSavedChats();
        } catch (localError) {
            console.error('Failed to get saved chats from local storage:', localError);
            return [];
        }
    }
}

export async function removeSavedChatItem(id: string): Promise<boolean> {
    const result = await dbRemoveSavedChatItem(id);
    if (result) {
        // Update local storage after successful removal
        const currentSavedChats = await getSavedChats();
        const updatedChats = currentSavedChats.filter(chat => chat.id !== id);
        await storeSavedChats(updatedChats);
    }
    return result;
}

export async function removeSavedChatItemById(id: string): Promise<boolean> {
    const result = await dbRemoveSavedChatItemById(id);
    if (result) {
        // Update local storage after successful removal
        const currentSavedChats = await getSavedChats();
        const updatedChats = currentSavedChats.filter(chat => chat.id !== id);
        await storeSavedChats(updatedChats);
    }
    return result;
}

async function refreshSavedFullSessionsFromServer(): Promise<ChatSession[]> {
    const backendSessions = await dbGetSavedFullChatSessions();
    await storeSavedFullChats(backendSessions);
    return backendSessions;
}

export async function getSavedFullChatSessions(): Promise<ChatSession[]> {
    try {
        return await refreshSavedFullSessionsFromServer();
    } catch (error) {
        console.warn('Failed to fetch saved full chats from backend, falling back to local data:', error);
        try {
            return await getSavedFullChats();
        } catch (localError) {
            console.error('Failed to get saved full chats from local storage:', localError);
            return [];
        }
    }
}

export async function removeSavedFullChatSession(id: string): Promise<boolean> {
    const result = await dbRemoveSavedFullChatSession(id);
    if (result) {
        // Update local storage after successful removal
        const currentSessions = await getSavedFullChats();
        const updatedSessions = currentSessions.filter(session => session.id !== id);
        await storeSavedFullChats(updatedSessions);
    }
    return result;
}

async function refreshChatHistoryFromServer(): Promise<ChatSession[]> {
    const backendHistory = await dbGetChatHistory();
    await storeChatHistory(backendHistory);
    return backendHistory;
}

export async function getChatHistory(): Promise<ChatSession[]> {
    try {
        return await refreshChatHistoryFromServer();
    } catch (error) {
        console.warn('Failed to fetch chat history from backend, falling back to local data:', error);
        try {
            const localHistory = await getLocalChatHistory();
            return Array.isArray(localHistory) ? localHistory.map(normalizeSessionMessages) : [];
        } catch (localError) {
            console.error('Failed to get chat history from local storage:', localError);
            return [];
        }
    }
}

/** Bulk replace of history is not mirrored server-side; list rows are written per session. */
export async function saveChatHistory(_sessions: ChatSession[]): Promise<void> {}

export async function addOrUpdateChatHistory(session: ChatMessage[], modelId: string, modelName: string): Promise<void> {
    await dbAddOrUpdateChatHistory(session, modelId, modelName);
}

/**
 * Add or merge a saved session into local IndexedDB chat history.
 * Call after backend save so the sidebar shows it immediately and persists across refresh.
 */
export async function addOrMergeSessionToLocalHistory(saved: {
    id?: string;
    codeProjectId?: string | null;
    session?: {
        title?: string;
        modelId?: string;
        messages?: ChatMessage[];
        metadata?: ChatSession['metadata'];
        personalityId?: string;
        systemPrompt?: string;
    };
    starred?: boolean;
    isPublished?: boolean;
    publishedAt?: string;
    publishedTitle?: string;
    publishedDescription?: string;
    [key: string]: unknown;
}, title?: string, chat?: ChatMessage[]): Promise<void> {
    const sessionForList = {
        id: saved.id,
        codeProjectId: saved.codeProjectId ?? null,
        title: saved.session?.title || title || 'New chat',
        messages: saved.session?.messages || chat || [],
        modelId: saved.session?.modelId,
        metadata: saved.session?.metadata,
        personalityId: saved.session?.personalityId,
        systemPrompt: saved.session?.systemPrompt,
        starred: saved.starred,
        isPublished: saved.isPublished,
        publishedAt: saved.publishedAt,
        publishedTitle: saved.publishedTitle,
        publishedDescription: saved.publishedDescription,
    };
    const current = await getLocalChatHistory();
    await storeChatHistory(upsertChatHistorySession(current, sessionForList as ChatSession));
}

async function refreshPinnedChatsFromServer(): Promise<ChatSession[]> {
    const backendPinnedChats = await dbGetPinnedChats();
    await storePinnedChats(backendPinnedChats);
    return backendPinnedChats;
}

export async function getPinnedChats(): Promise<ChatSession[]> {
    try {
        return await refreshPinnedChatsFromServer();
    } catch (error) {
        console.warn('Failed to fetch pinned chats from backend, falling back to local data:', error);
        try {
            return await getLocalPinnedChats();
        } catch (localError) {
            console.error('Failed to get pinned chats from local storage:', localError);
            return [];
        }
    }
}

/**
 * Load chat resources from IndexedDB only (fast, instant).
 * Use for initial render so sidebar shows conversations immediately.
 */
export async function getLocalChatResources(): Promise<{
    savedChats: ChatMessage[];
    savedFullChats: ChatSession[];
    chatHistory: ChatSession[];
    pinnedChats: ChatSession[];
}> {
    try {
        const [localSavedChats, localSavedFullChats, localChatHistory, localPinnedChats] = await Promise.all([
            getSavedChats(),
            getSavedFullChats(),
            getLocalChatHistory(),
            getLocalPinnedChats()
        ]);

        return {
            savedChats: Array.isArray(localSavedChats) ? (normalizeChatMessages(localSavedChats) as ChatMessage[]) : [],
            savedFullChats: Array.isArray(localSavedFullChats) ? (localSavedFullChats.map(normalizeSessionMessages) as ChatSession[]) : [],
            chatHistory: Array.isArray(localChatHistory) ? (localChatHistory.map(normalizeSessionMessages) as ChatSession[]) : [],
            pinnedChats: Array.isArray(localPinnedChats) ? (localPinnedChats.map(normalizeSessionMessages) as ChatSession[]) : [],
        };
    } catch (error) {
        console.warn('Failed to get chat resources from IndexedDB:', error);
        return {
            savedChats: [],
            savedFullChats: [],
            chatHistory: [],
            pinnedChats: []
        };
    }
}

export async function getAllChatResources(): Promise<{
    savedChats: ChatMessage[];
    savedFullChats: ChatSession[];
    chatHistory: ChatSession[];
    pinnedChats: ChatSession[];
}> {
    try {
        const backendResources = await dbGetAllChatResources();

        // Store fresh backend data in IndexedDB for offline access
        await Promise.all([
            storeSavedChats(backendResources.savedChats || []),
            storeSavedFullChats(backendResources.savedFullChats || []),
            storeChatHistory(backendResources.chatHistory || []),
            storePinnedChats(backendResources.pinnedChats || [])
        ]);

        return {
            savedChats: backendResources.savedChats || [],
            savedFullChats: backendResources.savedFullChats || [],
            chatHistory: backendResources.chatHistory || [],
            pinnedChats: backendResources.pinnedChats || []
        };
    } catch (error) {
        console.warn('Failed to fetch from backend, falling back to local IndexedDB data:', error);

        const [localSavedChats, localSavedFullChats, localChatHistory, localPinnedChats] = await Promise.all([
            getSavedChats(),
            getSavedFullChats(),
            getLocalChatHistory(),
            getLocalPinnedChats()
        ]);

        return {
            savedChats: Array.isArray(localSavedChats) ? (normalizeChatMessages(localSavedChats) as ChatMessage[]) : [],
            savedFullChats: Array.isArray(localSavedFullChats) ? (localSavedFullChats.map(normalizeSessionMessages) as ChatSession[]) : [],
            chatHistory: Array.isArray(localChatHistory) ? (localChatHistory.map(normalizeSessionMessages) as ChatSession[]) : [],
            pinnedChats: Array.isArray(localPinnedChats) ? (localPinnedChats.map(normalizeSessionMessages) as ChatSession[]) : [],
        };
    }
}

export async function pinChatSession(session: ChatSession, pinnedChats: ChatSession[]): Promise<ChatSession[]> {
    if (!(await isSessionPinned(session, pinnedChats))) {
        await dbPinChatSession(session);
        const updatedPinnedChats = [session, ...pinnedChats];
        await storePinnedChats(updatedPinnedChats);
        return updatedPinnedChats;
    }
    return pinnedChats;
}

export async function unpinChatSession(session: ChatSession): Promise<boolean> {
    const result = await dbUnpinChatSession(session);
    if (result) {
        // Update local storage after successful unpin
        const currentPinnedChats = await getLocalPinnedChats();
        const updatedPinnedChats = currentPinnedChats.filter(chat => chat.id !== session.id);
        await storePinnedChats(updatedPinnedChats);
    }
    return result;
}

export async function toggleChatSessionStarred(sessionId: string): Promise<ChatSession> {
    const response = await serverCall({
        serverCallProps: {
            call: serverCalls.postGatewayModelChatsToggleStarred,
            data: { sessionId }
        },
        authorized: true,
    });
    return response.dataReturned;
}

export async function removeChatHistorySession(id: string): Promise<boolean> {
    const result = await dbRemoveChatHistorySessionById(id);
    if (result) {
        const currentHistory = await getLocalChatHistory();
        const updatedHistory = currentHistory.filter(session => session.id !== id);
        await storeChatHistory(updatedHistory);
    }
    return result;
}

export async function removeChatHistorySessionById(id: string): Promise<boolean> {
    const result = await dbRemoveChatHistorySessionById(id);
    if (result) {
        // Update local storage after successful removal
        const currentHistory = await getLocalChatHistory();
        const updatedHistory = currentHistory.filter(session => session.id !== id);
        await storeChatHistory(updatedHistory);
    }
    return result;
}

export async function getUserChatStats(): Promise<UserChatStats> {
    return dbGetUserChatStats();
}

async function isSessionPinned(session: ChatSession, pinnedChats: ChatSession[]): Promise<boolean> {
    return pinnedChats.some((chat) => chat.id === session.id);
}

export async function getExistingChatTitle(session: ChatMessage[]): Promise<string | null> {
    if (!session.length) return null;
    const history = await getChatHistory();
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

export function formatNaira(usd: string): string {
    const num = parseFloat(usd);
    if (Number.isNaN(num)) return usd;
    return `₦${(num * USD_TO_NGN).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function formatCost(usd: number, showNaira: boolean): string {
    return showNaira
        ? `₦${(usd * USD_TO_NGN).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
        : `$${usd.toFixed(4)}`;
}

