import type { ChatSession } from "@/app/components/model-interface/shared/types";

/** Recency for sidebar sort — uses denormalized metadata when message bodies are stripped. */
export function resolveSessionLastMessageTimestamp(session: ChatSession): number {
  const fromMetadata = session.metadata?.lastMessageAt;
  if (typeof fromMetadata === "number" && Number.isFinite(fromMetadata)) {
    return fromMetadata;
  }
  const msgs = session.messages;
  if (!msgs?.length) return 0;
  const last = msgs[msgs.length - 1];
  return typeof last?.timestamp === "number" ? last.timestamp : 0;
}

export type MergeSidebarSessionOptions = {
  /** Sidebar rows store metadata only — message bodies are cleared by default. */
  stripMessages?: boolean;
};

/**
 * Merge a session snapshot into sidebar history without losing recency.
 * Opening a chat must not change sort order unless a newer message exists.
 */
export function mergeSidebarSessionRecord(
  existing: ChatSession | undefined,
  incoming: ChatSession,
  options: MergeSidebarSessionOptions = {},
): ChatSession {
  const stripMessages = options.stripMessages ?? true;
  const lastMessageAt = Math.max(
    existing ? resolveSessionLastMessageTimestamp(existing) : 0,
    resolveSessionLastMessageTimestamp(incoming),
  );

  const merged: ChatSession = {
    ...existing,
    ...incoming,
    metadata: {
      ...existing?.metadata,
      ...incoming.metadata,
      ...(lastMessageAt > 0 ? { lastMessageAt } : {}),
    },
  };

  if (stripMessages) {
    merged.messages = [];
  } else if (!incoming.messages?.length && existing?.messages?.length) {
    merged.messages = existing.messages;
  }

  return merged;
}
