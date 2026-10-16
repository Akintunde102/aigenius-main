import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversationById } from '@/lib/calls/model-chat-conversation';
import {
  CHAT_CONVERSATION_STALE_MS,
  chatQueryKeys,
} from './chat-query-keys';

type ConversationQueryOptions = {
  enabled?: boolean;
  /** Poll while a server-owned run (subagent) is writing this conversation. */
  refetchInterval?: number | false;
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
    staleTime: options?.refetchInterval ? 0 : CHAT_CONVERSATION_STALE_MS,
    refetchInterval: options?.refetchInterval,
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
