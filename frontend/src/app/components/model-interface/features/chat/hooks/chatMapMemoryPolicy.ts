import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { DRAFT_SESSION_KEY } from './chatOperations.constants';

/** Max conversation transcripts kept in React state (LRU); others reload on switch. */
export const CHAT_MAP_MAX_RETAINED_SESSIONS = 5;

/** Sidebar uses titles only — drop message bodies from history list state. */
export function stripMessagesFromHistorySessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((session) =>
    session.messages?.length ? { ...session, messages: [] } : session,
  );
}

export function touchSessionLru(order: string[], sessionId: string): string[] {
  if (!sessionId) return order;
  const without = order.filter((id) => id !== sessionId);
  return [...without, sessionId];
}

/**
 * Evict oldest non-pinned sessions from chatMap when over capacity.
 * Pinned ids always stay (active chat, draft, streaming/loading sessions).
 */
export function evictChatMapSessions(
  map: Record<string, ChatMessage[]>,
  touchOrder: string[],
  pinSessionIds: Iterable<string>,
  maxSessions = CHAT_MAP_MAX_RETAINED_SESSIONS,
): { map: Record<string, ChatMessage[]>; touchOrder: string[] } {
  const pins = new Set(pinSessionIds);
  pins.add(DRAFT_SESSION_KEY);

  const nextMap = { ...map };
  let order = [...touchOrder];

  const occupiedIds = () =>
    Object.keys(nextMap).filter((id) => (nextMap[id]?.length ?? 0) > 0 || pins.has(id));

  const evictOne = (): boolean => {
    for (const id of order) {
      if (pins.has(id)) continue;
      if (!nextMap[id]) continue;
      delete nextMap[id];
      order = order.filter((entry) => entry !== id);
      return true;
    }
    for (const id of Object.keys(nextMap)) {
      if (pins.has(id)) continue;
      delete nextMap[id];
      order = order.filter((entry) => entry !== id);
      return true;
    }
    return false;
  };

  while (occupiedIds().length > maxSessions) {
    if (!evictOne()) break;
  }

  return { map: nextMap, touchOrder: order };
}
