import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { normalizeSessionMessages } from '@/lib/utils/messageContentUtils';
import { getConversationById } from '@/lib/calls/model-chat-conversation';
import { CHAT_CONVERSATION_STALE_MS, chatQueryKeys } from '@/lib/hooks/chat-query-keys';
import { SetChatForSession } from './chatOperations.types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';
import { bumpDraftConversationEpoch } from '@/app/components/model-interface/conversation/conversationViewSession';

interface UseSessionSwitcherOptions {
    currentSessionId: string | null;
    chatMap: Record<string, ChatMessage[]>;
    setChatForSession: SetChatForSession;
}

/**
 * Hook for managing session switching.
 *
 * Switching is now a synchronous key change — messages derive from chatMap
 * which is pre-populated from chatHistory on load. A background fetch runs
 * afterward to reconcile with the server, writing silently into the map.
 */
export function useSessionSwitcher({ currentSessionId, chatMap, setChatForSession }: UseSessionSwitcherOptions) {
    const queryClient = useQueryClient();

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

        // 1. Key change — chat derives from chatMap[session.id] automatically.
        setCurrentSessionId(session.id);

        // 2. Cold path: fill the map from local session data if not yet present.
        if (!chatMap[session.id] && session.messages?.length) {
            const normalized = normalizeSessionMessages(ensureSystemPromptMessage(session));
            setChatForSession(session.id, (normalized.messages || []) as ChatMessage[]);
        }

        // 3. Background reconciliation with the server — updates the map silently.
        (async () => {
            const sid = session.id!;
            try {
                const updatedSession = await loadSessionFromBackend(queryClient, sid);
                if (!updatedSession?.messages) return;

                const normalized = normalizeSessionMessages(ensureSystemPromptMessage(updatedSession));
                const messages = (normalized.messages || []) as ChatMessage[];

                setChatForSession(sid, (prev) => {
                    if (!messages.length) {
                        return prev;
                    }
                    // Do not clobber a just-streamed local transcript with a lagging server snapshot.
                    if (prev.length > messages.length) {
                        return prev;
                    }
                    return messages;
                });

                if (setChatHistory) {
                    setChatHistory(prev =>
                        prev.map(s => s.id === sid ? { ...s, ...normalized, messages } : s)
                    );
                }
            } catch {
                // Silently ignore — local data is already shown.
            }
        })();
    }, [chatMap, setChatForSession, ensureSystemPromptMessage, queryClient]);

    /**
     * Create a new draft session (clears the draft slot).
     */
    const createAndSwitchToNewSession = useCallback((
        setCurrentSessionId: (id: string | null) => void
    ) => {
        bumpDraftConversationEpoch();
        setCurrentSessionId(null);
        setChatForSession(DRAFT_SESSION_KEY, []);
    }, [setChatForSession]);

    const isSessionActive = useCallback(
        (sessionId: string) => currentSessionId === sessionId,
        [currentSessionId]
    );

    return {
        switchToSession,
        createAndSwitchToNewSession,
        isSessionActive
    };
}

function conversationToSession(
    conversation: NonNullable<Awaited<ReturnType<typeof getConversationById>>>,
): ChatSession {
    return {
        id: conversation.id,
        title: conversation.session.title,
        modelId: conversation.session.modelId,
        messages: conversation.session.messages,
        metadata: conversation.metadata,
        personalityId: conversation.personalityId,
        systemPrompt: conversation.systemPrompt,
        starred: conversation.starred,
        isPublished: conversation.isPublished,
        publishedAt: conversation.publishedAt,
        publishedTitle: conversation.publishedTitle,
        publishedDescription: conversation.publishedDescription,
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
        return conversationToSession(conversation);
    } catch {
        return null;
    }
}
