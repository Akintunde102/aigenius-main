import { useQuery } from '@tanstack/react-query';
import { getAllChatResources } from '@/lib/utils/modelChatConversationUtils';
import {
  CHAT_RESOURCES_REFETCH_INTERVAL_MS,
  CHAT_RESOURCES_STALE_MS,
  chatQueryKeys,
} from './chat-query-keys';

export function useChatResourcesQuery(enabled = true) {
  return useQuery({
    queryKey: chatQueryKeys.resources(),
    queryFn: () => getAllChatResources(),
    enabled,
    staleTime: CHAT_RESOURCES_STALE_MS,
    refetchInterval: CHAT_RESOURCES_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
  });
}
