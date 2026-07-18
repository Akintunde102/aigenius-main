export const chatQueryKeys = {
  all: ['chat'] as const,
  resources: () => [...chatQueryKeys.all, 'resources'] as const,
  conversation: (conversationId: string) =>
    [...chatQueryKeys.all, 'conversation', conversationId] as const,
};

/** How long sidebar resources are considered fresh before a background refetch. */
export const CHAT_RESOURCES_STALE_MS = 60_000;

/** Periodic background refetch to pick up remote changes (sidebar list). */
export const CHAT_RESOURCES_REFETCH_INTERVAL_MS = 5 * 60_000;

/** Per-conversation detail stale window. */
export const CHAT_CONVERSATION_STALE_MS = 30_000;
