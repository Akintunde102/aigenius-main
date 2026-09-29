import type { ChatSession } from "@/app/components/model-interface/shared/types";
import {
  mergeSidebarSessionRecord,
  resolveSessionLastMessageTimestamp,
  formatSessionRelativeTime,
} from "../sessionRecency";
import { sortSidebarSessions } from "@/app/components/ChatHistoryList/chatHistoryListGrouping";

describe("mergeSidebarSessionRecord", () => {
  it("preserves lastMessageAt when reconciling a stripped sidebar row with server data", () => {
    const existing: ChatSession = {
      id: "chat-1",
      title: "Top chat",
      modelId: "gpt-4o",
      messages: [],
      metadata: { lastMessageAt: 9_000 },
    };

    const fromServer: ChatSession = {
      id: "chat-1",
      title: "Top chat",
      modelId: "gpt-4o",
      messages: [{ role: "user", content: "hello", timestamp: 9_000 }],
      metadata: { totalCost: 0.01 },
    };

    const merged = mergeSidebarSessionRecord(existing, fromServer);

    expect(merged.messages).toEqual([]);
    expect(merged.metadata?.lastMessageAt).toBe(9_000);
    expect(resolveSessionLastMessageTimestamp(merged)).toBe(9_000);
  });

  it("does not move a chat to the bottom after a click-style reconcile", () => {
    const sessions: ChatSession[] = [
      {
        id: "clicked",
        title: "Clicked",
        modelId: "gpt-4o",
        messages: [],
        metadata: { lastMessageAt: 9_000 },
      },
      {
        id: "other",
        title: "Other",
        modelId: "gpt-4o",
        messages: [],
        metadata: { lastMessageAt: 5_000 },
      },
    ];

    const reconciled = sessions.map((session) =>
      session.id === "clicked"
        ? mergeSidebarSessionRecord(session, {
            ...session,
            messages: [{ role: "user", content: "hello", timestamp: 9_000 }],
            metadata: { totalCost: 0.01 },
          })
        : session,
    );

    expect(sortSidebarSessions(reconciled).map((s) => s.id)).toEqual([
      "clicked",
      "other",
    ]);
  });
});

describe("formatSessionRelativeTime", () => {
  it("does not return 'now' just because a session is viewed/active", () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const session: ChatSession = {
      id: "chat-1",
      title: "Older Chat",
      modelId: "gpt-4o",
      messages: [],
      metadata: { lastMessageAt: twoHoursAgo },
    };

    // Even if isActive: true was passed as boolean previously or hasDraft: false
    expect(formatSessionRelativeTime(session, true)).toBe("2h");
    expect(formatSessionRelativeTime(session, { hasDraft: false })).toBe("2h");
  });

  it("returns 'now' when hasDraft is true (typed without sending)", () => {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const session: ChatSession = {
      id: "chat-1",
      title: "Older Chat With Unsent Draft",
      modelId: "gpt-4o",
      messages: [],
      metadata: { lastMessageAt: twoDaysAgo },
    };

    expect(formatSessionRelativeTime(session, { hasDraft: true })).toBe("now");
  });

  it("returns 'now' when a message was sent less than 60 seconds ago", () => {
    const thirtySecAgo = Date.now() - 30 * 1000;
    const session: ChatSession = {
      id: "chat-1",
      title: "Recent Chat",
      modelId: "gpt-4o",
      messages: [{ role: "user", content: "hi", timestamp: thirtySecAgo }],
    };

    expect(formatSessionRelativeTime(session)).toBe("now");
  });

  it("formats relative time correctly for various intervals", () => {
    const createSession = (ageMs: number): ChatSession => ({
      id: "chat-1",
      title: "Test",
      modelId: "gpt-4o",
      messages: [],
      metadata: { lastMessageAt: Date.now() - ageMs },
    });

    expect(formatSessionRelativeTime(createSession(5 * 60 * 1000))).toBe("5m");
    expect(formatSessionRelativeTime(createSession(3 * 60 * 60 * 1000))).toBe("3h");
    expect(formatSessionRelativeTime(createSession(4 * 24 * 60 * 60 * 1000))).toBe("4d");
  });

  it("returns empty string when no timestamp exists", () => {
    const session: ChatSession = {
      id: "chat-empty",
      title: "Empty Chat",
      modelId: "gpt-4o",
      messages: [],
    };

    expect(formatSessionRelativeTime(session)).toBe("");
  });
});
