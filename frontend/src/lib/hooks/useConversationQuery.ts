import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversationById } from '@/lib/calls/model-chat-conversation';
import {
  CHAT_CONVERSATION_STALE_MS,
  chatQueryKeys,
} from './chat-query-keys';

type ConversationQueryOptions = {
  enabled?: boolean;
};

export function useConversationQuery(
  conversationId: string | null,
  options?: ConversationQueryOptions,
) {
  const enabled = !!conversationId && (options?.enabled ?? true);

  return useQuery({
    queryKey: chatQueryKeys.conversation(conversationId ?? ''),
    queryFn: () => getConversationById(conversationId!),
    enabled,
    staleTime: CHAT_CONVERSATION_STALE_MS,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  });
}

export function useFetchConversation() {
  const queryClient = useQueryClient();

  return (conversationId: string) =>
    queryClient.fetchQuery({
      queryKey: chatQueryKeys.conversation(conversationId),
      queryFn: () => getConversationById(conversationId),
      staleTime: CHAT_CONVERSATION_STALE_MS,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    });
}
