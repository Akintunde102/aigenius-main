import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getAllChatResources } from '@/lib/utils/modelChatConversationUtils';
import { subscribeToTokenRefresh } from '@/lib/api/auth-client';
import { waitForAccessToken } from '@/lib/api/wait-for-access-token';
import {
  CHAT_RESOURCES_REFETCH_INTERVAL_MS,
  CHAT_RESOURCES_STALE_MS,
  chatQueryKeys,
} from './chat-query-keys';

export function useChatResourcesQuery(enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const invalidateResources = () => {
      void queryClient.invalidateQueries({ queryKey: chatQueryKeys.resources() });
    };

    const unsubscribe = subscribeToTokenRefresh(invalidateResources);
    return unsubscribe;
  }, [enabled, queryClient]);

  return useQuery({
    queryKey: chatQueryKeys.resources(),
    queryFn: async () => {
      await waitForAccessToken();
      return getAllChatResources();
    },
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
