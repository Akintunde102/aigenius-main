import type { QueryClient } from '@tanstack/react-query';
import { getConversationById } from '@/lib/calls/model-chat-conversation';
import { CHAT_CONVERSATION_STALE_MS, chatQueryKeys } from '@/lib/hooks/chat-query-keys';
import type { ChatSession } from '@/app/components/model-interface/shared/types';

type ConversationRecord = NonNullable<Awaited<ReturnType<typeof getConversationById>>>;

export function conversationToChatSession(conversation: ConversationRecord): ChatSession {
    return {
        id: conversation.id,
        codeProjectId: conversation.codeProjectId ?? null,
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
        parentConversationId: conversation.parentConversationId ?? null,
    };
}

export function readConversationSessionFromCache(
    queryClient: QueryClient,
    sessionId: string,
): ChatSession | null {
    const conversation = queryClient.getQueryData<ConversationRecord | null>(
        chatQueryKeys.conversation(sessionId),
    );
    if (!conversation?.session) return null;
    return conversationToChatSession(conversation);
}

export function prefetchConversationTranscript(
    queryClient: QueryClient,
    sessionId: string,
): void {
    if (!sessionId) return;
    void queryClient.prefetchQuery({
        queryKey: chatQueryKeys.conversation(sessionId),
        queryFn: () => getConversationById(sessionId),
        staleTime: CHAT_CONVERSATION_STALE_MS,
    });
}
