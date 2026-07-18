import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { getLocalChatResources, mergeChatHistorySessions } from '@/lib/utils/modelChatConversationUtils';
import { upsertSessionMessagesInHistory } from '@/app/components/model-interface/conversation/sessionMessagesMap';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { shouldAcceptRemoteConversationSync } from '@/lib/utils/conversationScrollMemory';
import { useChatResourcesQuery } from '@/lib/hooks/useChatResourcesQuery';
import { chatQueryKeys } from '@/lib/hooks/chat-query-keys';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';

export { DRAFT_SESSION_KEY };

export type ChatUpdater = ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]);

type UseChatDataOptions = {
  /** When true, passive history hydration must not overwrite this session's transcript. */
  isPassiveSyncBlocked?: (sessionId: string) => boolean;
};

type SetChatForSessionOptions = {
  passive?: boolean;
};

/**
 * Central map-based chat store.
 *
 * chatMap holds messages for every loaded session keyed by sessionId.
 * The special key DRAFT_SESSION_KEY is used for a new unsaved conversation.
 * Switching sessions is now a pure key change — messages are already in the map.
 */
export function useChatData(options?: UseChatDataOptions) {
    const isPassiveSyncBlocked = options?.isPassiveSyncBlocked;
    const queryClient = useQueryClient();
    const [chatMap, setChatMap] = useState<Record<string, ChatMessage[]>>({});
    const [savedChats, setSavedChats] = useState<ChatMessage[]>([]);
    const [savedFullChats, setSavedFullChats] = useState<ChatSession[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [localReady, setLocalReady] = useState(false);

    const {
        data: remoteResources,
        isFetching: isRemoteFetching,
        refetch: refetchRemoteResources,
    } = useChatResourcesQuery(localReady);

    const applyRemoteResources = useCallback(
        (resources: {
            savedChats: ChatMessage[];
            savedFullChats: ChatSession[];
            chatHistory: ChatSession[];
            pinnedChats: ChatSession[];
        }) => {
            setSavedChats(resources.savedChats || []);
            setSavedFullChats(resources.savedFullChats || []);
            setChatHistory((prev) => mergeChatHistorySessions(resources.chatHistory || [], prev));
        },
        [],
    );

    // Pre-populate / reconcile chatMap from chatHistory whenever history updates.
    // Passive hydration is blocked only while this tab is sending/streaming that session.
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

                if (isPassiveSyncBlocked?.(session.id)) {
                    continue;
                }

                if (!shouldAcceptRemoteConversationSync(existingMessages, incomingMessages)) {
                    continue;
                }

                next[session.id] = incomingMessages;
                changed = true;
            }
            return changed ? next : prev;
        });
    }, [chatHistory, isPassiveSyncBlocked]);

    /** Write messages for a specific session without touching any other session. */
    const setChatForSession = useCallback((
        sessionId: string,
        updater: ChatUpdater,
        setOptions?: SetChatForSessionOptions,
    ) => {
        void setOptions;
        setChatMap(prev => ({
            ...prev,
            [sessionId]: typeof updater === 'function'
                ? updater(prev[sessionId] ?? [])
                : updater,
        }));
    }, []);

    const refreshChatHistory = useCallback(async () => {
        try {
            const result = await refetchRemoteResources();
            if (result.data) {
                applyRemoteResources(result.data);
            }
        } catch (error) {
            console.error('Failed to refresh chat history:', error);
        }
    }, [applyRemoteResources, refetchRemoteResources]);

    const populateFromBackend = useCallback(async () => {
        try {
            await queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
            const result = await refetchRemoteResources();
            if (result.data) {
                applyRemoteResources(result.data);
            }
        } catch (error) {
            console.error('Failed to populate from backend:', error);
        }
    }, [applyRemoteResources, queryClient, refetchRemoteResources]);

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
                    setLocalReady(true);
                }
                setIsInitialLoading(false);
            } catch (error) {
                if (!cancelled) {
                    setSavedChats([]);
                    setSavedFullChats([]);
                    setChatHistory([]);
                    setLocalReady(true);
                }
                setIsInitialLoading(false);
                console.error('Failed to load local chat resources:', error);
            }
        };

        loadDataAsync();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!remoteResources) return;
        applyRemoteResources(remoteResources);
    }, [remoteResources, applyRemoteResources]);

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
        isInitialLoading: isInitialLoading || (localReady && isRemoteFetching && chatHistory.length === 0),
        refreshChatHistory,
        populateFromBackend,
        updateSessionMessages,
    };
}
