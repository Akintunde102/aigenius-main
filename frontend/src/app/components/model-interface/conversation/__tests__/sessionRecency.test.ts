import type { ChatSession } from "@/app/components/model-interface/shared/types";
import {
  mergeSidebarSessionRecord,
  resolveSessionLastMessageTimestamp,
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
