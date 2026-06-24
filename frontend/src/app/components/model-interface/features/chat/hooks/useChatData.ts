import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { getAllChatResources, getLocalChatResources, mergeChatHistorySessions } from '@/lib/utils/modelChatConversationUtils';
import { upsertSessionMessagesInHistory } from '@/app/components/model-interface/conversation/sessionMessagesMap';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { buildConversationMessageSignature } from '@/lib/utils/conversationScrollMemory';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';

export { DRAFT_SESSION_KEY };

export type ChatUpdater = ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]);

/**
 * Central map-based chat store.
 *
 * chatMap holds messages for every loaded session keyed by sessionId.
 * The special key DRAFT_SESSION_KEY is used for a new unsaved conversation.
 * Switching sessions is now a pure key change — messages are already in the map.
 */
export function useChatData() {
    const [chatMap, setChatMap] = useState<Record<string, ChatMessage[]>>({});
    const [savedChats, setSavedChats] = useState<ChatMessage[]>([]);
    const [savedFullChats, setSavedFullChats] = useState<ChatSession[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    // Sessions edited during this page lifetime should not be overwritten by passive
    // history hydration (local/backend) to avoid clobbering active frontend state.
    const mutableSessionIdsRef = useRef<Set<string>>(new Set());

    // Pre-populate / reconcile chatMap from chatHistory whenever history updates.
    // If a session slot has not been edited in this tab, allow history snapshots to
    // replace stale local entries (e.g. backend returned newer messages).
    useEffect(() => {
        if (chatHistory.length === 0) return;
        setChatMap(prev => {
            const next = { ...prev };
            let changed = false;
            for (const session of chatHistory) {
                if (!session.id || !session.messages?.length) continue;
                const normalized = normalizeSessionMessages(session);
                const incomingMessages = (normalized.messages || []) as ChatMessage[];
                const existingMessages = next[session.id];

                if (!existingMessages) {
                    next[session.id] = incomingMessages;
                    changed = true;
                    continue;
                }

                const hasLocalEdits = mutableSessionIdsRef.current.has(session.id);
                if (hasLocalEdits) {
                    continue;
                }

                const incomingSignature = buildConversationMessageSignature(incomingMessages);
                const existingSignature = buildConversationMessageSignature(existingMessages);
                if (incomingSignature !== existingSignature) {
                    next[session.id] = incomingMessages;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [chatHistory]);

    /** Write messages for a specific session without touching any other session. */
    const setChatForSession = useCallback((sessionId: string, updater: ChatUpdater) => {
        mutableSessionIdsRef.current.add(sessionId);
        setChatMap(prev => ({
            ...prev,
            [sessionId]: typeof updater === 'function'
                ? updater(prev[sessionId] ?? [])
                : updater,
        }));
    }, []);

    const refreshChatHistory = useCallback(async () => {
        try {
            const { chatHistory: updatedHistory } = await getAllChatResources();
            setChatHistory((prev) => mergeChatHistorySessions(updatedHistory || [], prev));
        } catch (error) {
            console.error('Failed to refresh chat history:', error);
        }
    }, []);

    const populateFromBackend = useCallback(async () => {
        try {
            const { savedChats, savedFullChats, chatHistory } = await getAllChatResources();
            setSavedChats(savedChats || []);
            setSavedFullChats(savedFullChats || []);
            setChatHistory((prev) => mergeChatHistorySessions(chatHistory || [], prev));
        } catch (error) {
            console.error('Failed to populate from backend:', error);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadDataAsync = async () => {
            try {
                setIsInitialLoading(true);

                const localResources = await getLocalChatResources();
                if (!cancelled) {
                    setSavedChats(localResources.savedChats);
                    setSavedFullChats(localResources.savedFullChats);
                    setChatHistory(localResources.chatHistory);
                }
                setIsInitialLoading(false);

                const backendResources = await getAllChatResources();
                if (!cancelled) {
                    setSavedChats(backendResources.savedChats);
                    setSavedFullChats(backendResources.savedFullChats);
                    setChatHistory((prev) => mergeChatHistorySessions(backendResources.chatHistory || [], prev));
                }
            } catch (error) {
                if (!cancelled) {
                    setSavedChats([]);
                    setSavedFullChats([]);
                    setChatHistory([]);
                }
                setIsInitialLoading(false);
            }
        };

        loadDataAsync();
        return () => { cancelled = true; };
    }, []);

    /** Update both the live chatMap and the sidebar history entry for a session. */
    const updateSessionMessages = useCallback((sessionId: string, messages: ChatMessage[], sessionData?: Partial<ChatSession>) => {
        setChatForSession(sessionId, messages);
        setChatHistory((prev) =>
            upsertSessionMessagesInHistory(prev, sessionId, messages, sessionData),
        );
    }, [setChatForSession]);

    return {
        chatMap,
        setChatForSession,
        savedChats,
        setSavedChats,
        savedFullChats,
        setSavedFullChats,
        chatHistory,
        setChatHistory,
        isInitialLoading,
        refreshChatHistory,
        populateFromBackend,
        updateSessionMessages,
    };
}
