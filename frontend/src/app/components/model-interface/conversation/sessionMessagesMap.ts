import type { ChatMessage, ChatSession } from "@/app/components/model-interface/shared/types";

/**
 * Logical per-conversation message lists (T4). `chatHistory` is the canonical
 * list of sessions in the app; this module holds pure upsert/read helpers so
 * background updates stay keyed by id and do not assume a single global transcript.
 */

export type SessionId = string;

/** Read-only view of messages keyed by conversation id (for tests and future consumers). */
export function chatHistoryToMessagesBySessionId(
  sessions: ReadonlyArray<Pick<ChatSession, "id" | "messages">>,
): Readonly<Record<SessionId, ReadonlyArray<ChatMessage>>> {
  const out: Record<string, ChatMessage[]> = {};
  for (const s of sessions) {
    if (s.id) {
      out[s.id] = [...(s.messages ?? [])];
    }
  }
  return out;
}

export function getMessagesForSession(
  map: Readonly<Record<SessionId, ReadonlyArray<ChatMessage>>>,
  sessionId: SessionId | null,
  fallback: ChatMessage[],
): ChatMessage[] {
  if (sessionId == null) {
    return fallback;
  }
  const hit = map[sessionId];
  return hit != null ? [...hit] : fallback;
}

/**
 * Upsert one session’s messages into the sidebar/history list (same semantics as previous inline logic in useChatData).
 */
export function upsertSessionMessagesInHistory(
  prev: ChatSession[],
  sessionId: string,
  messages: ChatMessage[],
  sessionData?: Partial<ChatSession>,
): ChatSession[] {
  const exists = prev.some((s) => s.id === sessionId);
  if (exists) {
    return prev.map((session) =>
      session.id === sessionId
        ? { ...session, ...sessionData, messages }
        : session,
    );
  }
  const newSession: ChatSession = {
    id: sessionId,
    title: sessionData?.title || "New chat",
    messages,
    modelId: sessionData?.modelId || "",
    ...sessionData,
  };
  return [newSession, ...prev];
}
