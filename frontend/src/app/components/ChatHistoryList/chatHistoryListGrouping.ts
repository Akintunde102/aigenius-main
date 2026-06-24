import type { ChatSession } from "@/app/components/model-interface/shared/types";

function lastMessageTimestamp(session: ChatSession): number {
  const msgs = session.messages;
  if (!msgs?.length) return 0;
  const last = msgs[msgs.length - 1];
  return typeof last?.timestamp === "number" ? last.timestamp : 0;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type GroupedSidebarSessions = {
  starred: ChatSession[];
  recent: ChatSession[];
  earlier: ChatSession[];
};

/**
 * Partition non-active sessions for sidebar section headers (starred / recent / earlier).
 */
export function groupSidebarSessions(
  sessions: ChatSession[],
  nowMs: number = Date.now(),
): GroupedSidebarSessions {
  const starred: ChatSession[] = [];
  const recent: ChatSession[] = [];
  const earlier: ChatSession[] = [];

  for (const s of sessions) {
    if (s.starred) {
      starred.push(s);
      continue;
    }
    const t = lastMessageTimestamp(s);
    if (t > 0 && nowMs - t < SEVEN_DAYS_MS) {
      recent.push(s);
    } else {
      earlier.push(s);
    }
  }

  const byRecent = (a: ChatSession, b: ChatSession) =>
    lastMessageTimestamp(b) - lastMessageTimestamp(a);

  starred.sort(byRecent);
  recent.sort(byRecent);
  earlier.sort(byRecent);

  return { starred, recent, earlier };
}
