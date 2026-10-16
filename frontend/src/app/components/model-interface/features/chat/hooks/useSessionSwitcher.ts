import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { getConversationById } from '@/lib/calls/model-chat-conversation';
import { CHAT_CONVERSATION_STALE_MS, chatQueryKeys } from '@/lib/hooks/chat-query-keys';
import {
    conversationToChatSession,
    readConversationSessionFromCache,
} from '@/app/components/model-interface/conversation/conversationTranscriptQuery';
import { SetChatForSession } from './chatOperations.types';
import { bumpDraftConversationEpoch } from '@/app/components/model-interface/conversation/conversationViewSession';
import {
    getClientDraftSessionId,
    renewClientDraftSessionId,
} from '@/app/components/model-interface/conversation/clientDraftSession';
import { applyChatProjectScopeFromSession } from '@/lib/code-projects/apply-chat-project-scope';
import { shouldAcceptRemoteConversationSync } from '@/lib/utils/conversationScrollMemory';
import { mergeSidebarSessionRecord } from '@/app/components/model-interface/conversation/sessionRecency';
import {
  trackConversationCreated,
  trackConversationOpened,
} from '@/lib/analytics/product-events';

interface UseSessionSwitcherOptions {
    currentSessionId: string | null;
    chatMap: Record<string, ChatMessage[]>;
    setChatForSession: SetChatForSession;
    isPassiveSyncBlocked?: (sessionId: string) => boolean;
}

/**
 * Hook for managing session switching.
 *
 * Switching is now a synchronous key change — messages derive from chatMap
 * which is populated on demand (LRU) when the user opens a conversation.
 */
export function useSessionSwitcher({
    currentSessionId,
    chatMap,
    setChatForSession,
    isPassiveSyncBlocked,
}: UseSessionSwitcherOptions) {
    const queryClient = useQueryClient();
    const [hydratingTranscriptSessionId, setHydratingTranscriptSessionId] = useState<string | null>(null);

    const ensureSystemPromptMessage = useCallback((session: ChatSession): ChatSession => {
        if (!session.systemPrompt) return session;

        const hasSystemMessage = session.messages?.some((m) => m.role === 'system');
        if (hasSystemMessage) return session;

        const firstTimestamp = session.messages?.[0]?.timestamp ?? Date.now();
        const systemMessage: ChatMessage = {
            id: session.id ? `system_prompt_${session.id}` : `system_prompt_${firstTimestamp}`,
            role: 'system',
            content: session.systemPrompt,
            timestamp: Math.max(0, firstTimestamp - 1),
            modelId: session.modelId,
            modelName: session.modelId,
            sessionId: session.id,
        };

        return { ...session, messages: [systemMessage, ...(session.messages || [])] };
    }, []);

    /**
     * Switch to a session.
     *
     * The visual switch (messages shown) is instant because chatMap is already populated.
     * If the map slot is empty (cold path), it is filled from the session object immediately.
     * A background fetch reconciles with the server silently.
     */
    const switchToSession = useCallback((
        session: ChatSession,
        setCurrentSessionId: (id: string | null) => void,
        setChatHistory?: React.Dispatch<React.SetStateAction<ChatSession[]>>
    ) => {
        if (!session.id) return;

        trackConversationOpened(session.id);

        applyChatProjectScopeFromSession(session.codeProjectId);

        const sid = session.id!;

        // 1. Hydrate chatMap before switching the view key (avoids "Start a conversation…" flash).
        let hydrated = Boolean(chatMap[sid]?.length);
        if (!hydrated) {
            if (session.messages?.length) {
                const normalized = normalizeSessionMessages(ensureSystemPromptMessage(session));
                setChatForSession(sid, (normalized.messages || []) as ChatMessage[]);
                hydrated = true;
            } else {
                const cached = readConversationSessionFromCache(queryClient, sid);
                if (cached?.messages?.length) {
                    const normalized = normalizeSessionMessages(ensureSystemPromptMessage(cached));
                    setChatForSession(sid, (normalized.messages || []) as ChatMessage[]);
                    hydrated = true;
                }
            }
        }

        if (!hydrated) {
            setHydratingTranscriptSessionId(sid);
            void loadSessionFromBackend(queryClient, sid).then((loaded) => {
                setHydratingTranscriptSessionId((prev) => (prev === sid ? null : prev));
                if (!loaded?.messages?.length) return;
                if (isPassiveSyncBlocked?.(sid)) return;
                const normalized = normalizeSessionMessages(ensureSystemPromptMessage(loaded));
                const incoming = (normalized.messages || []) as ChatMessage[];
                setChatForSession(sid, (prev) => {
                    if (prev.length && !shouldAcceptRemoteConversationSync(prev, incoming)) {
                        return prev;
                    }
                    return incoming;
                });
            });
        } else {
            setHydratingTranscriptSessionId(null);
        }

        // 2. Key change — chat derives from chatMap[session.id] automatically.
        setCurrentSessionId(sid);

        // 3. Background reconciliation with the server — updates the map silently.
        (async () => {
            const sid = session.id!;
            try {
                const updatedSession = await loadSessionFromBackend(queryClient, sid);
                if (!updatedSession?.messages?.length) return;

                const normalized = normalizeSessionMessages(ensureSystemPromptMessage(updatedSession));
                const messages = (normalized.messages || []) as ChatMessage[];

                setChatForSession(sid, (prev) => {
                    if (!messages.length) {
                        return prev;
                    }
                    if (isPassiveSyncBlocked?.(sid)) {
                        return prev;
                    }
                    if (!shouldAcceptRemoteConversationSync(prev, messages)) {
                        return prev;
                    }
                    return messages;
                });

                if (setChatHistory) {
                    setChatHistory(prev =>
                        prev.map(s =>
                            s.id === sid ? mergeSidebarSessionRecord(s, normalized) : s,
                        ),
                    );
                }
            } catch {
                // Silently ignore — local data is already shown.
            }
        })();
    }, [chatMap, setChatForSession, ensureSystemPromptMessage, queryClient, isPassiveSyncBlocked]);

    /**
     * Create a new draft session (clears the draft slot).
     */
    const createAndSwitchToNewSession = useCallback((
        setCurrentSessionId: (id: string | null) => void
    ) => {
        bumpDraftConversationEpoch();
        renewClientDraftSessionId();
        setHydratingTranscriptSessionId(null);
        setCurrentSessionId(null);
        setChatForSession(getClientDraftSessionId(), []);
    }, [setChatForSession]);

    const isSessionActive = useCallback(
        (sessionId: string) => currentSessionId === sessionId,
        [currentSessionId]
    );

    return {
        switchToSession,
        createAndSwitchToNewSession,
        isSessionActive,
        hydratingTranscriptSessionId,
    };
}

async function loadSessionFromBackend(
    queryClient: ReturnType<typeof useQueryClient>,
    sessionId: string,
): Promise<ChatSession | null> {
    try {
        const conversation = await queryClient.fetchQuery({
            queryKey: chatQueryKeys.conversation(sessionId),
            queryFn: () => getConversationById(sessionId),
            staleTime: CHAT_CONVERSATION_STALE_MS,
            retry: 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        });
        if (!conversation?.session) return null;
        return conversationToChatSession(conversation);
    } catch {
        return null;
    }
}
