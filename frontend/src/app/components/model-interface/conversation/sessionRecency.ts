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

export type FormatSessionRelativeTimeOptions = {
  /** If the user has typed text without sending (unsent draft), display "now". */
  hasDraft?: boolean;
};

/**
 * Format relative timestamp string (e.g. "now", "8h", "5d", "13d", "2mo") for sidebar item.
 * Opening a chat does not change the time; time updates only on new/replayed message or unsent draft.
 */
export function formatSessionRelativeTime(
  session: ChatSession,
  options?: FormatSessionRelativeTimeOptions | boolean,
): string {
  const hasDraft =
    typeof options === "object" && options !== null
      ? Boolean(options.hasDraft)
      : false;

  if (hasDraft) return "now";

  let ts = resolveSessionLastMessageTimestamp(session);
  if (!ts) {
    const meta = session.metadata as Record<string, any> | undefined;
    const rawDate = meta?.lastAccessed || (session as any).updatedAt || (session as any).createdAt || session.publishedAt;
    if (rawDate) {
      const parsed = new Date(rawDate).getTime();
      if (!isNaN(parsed)) ts = parsed;
    }
  }

  if (!ts || isNaN(ts)) {
    return "";
  }

  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo`;
  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y`;
}

