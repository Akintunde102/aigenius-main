import type { ChatMessage, ChatSession } from "@/app/components/model-interface/shared/types";
import {
  chatHistoryToMessagesBySessionId,
  getMessagesForSession,
  upsertSessionMessagesInHistory,
} from "../sessionMessagesMap";

const msg = (id: string, content: string): ChatMessage =>
  ({
    id,
    role: "user",
    content,
    timestamp: 1,
  }) as ChatMessage;

describe("sessionMessagesMap", () => {
  it("chatHistoryToMessagesBySessionId builds a map", () => {
    const sessions: ChatSession[] = [
      { id: "a", title: "A", modelId: "m", messages: [msg("1", "hi")] } as ChatSession,
      { id: "b", title: "B", modelId: "m", messages: [msg("2", "yo")] } as ChatSession,
    ];
    const map = chatHistoryToMessagesBySessionId(sessions);
    expect(map.a).toHaveLength(1);
    expect(map.b[0].content).toBe("yo");
  });

  it("getMessagesForSession returns fallback for unknown id", () => {
    const fb: ChatMessage[] = [msg("x", "draft")];
    expect(getMessagesForSession({}, "missing", fb)).toEqual(fb);
    expect(getMessagesForSession({ a: [msg("1", "x")] }, null, fb)).toEqual(fb);
  });

  it("upsertSessionMessagesInHistory updates existing row", () => {
    const prev: ChatSession[] = [
      { id: "a", title: "T", modelId: "m", messages: [] } as ChatSession,
    ];
    const next = upsertSessionMessagesInHistory(prev, "a", [msg("1", "u")], {
      title: "New",
    });
    expect(next).toHaveLength(1);
    expect(next[0].messages).toHaveLength(1);
    expect(next[0].title).toBe("New");
  });

  it("upsertSessionMessagesInHistory prepends new session", () => {
    const prev: ChatSession[] = [
      { id: "old", title: "O", modelId: "m", messages: [] } as ChatSession,
    ];
    const next = upsertSessionMessagesInHistory(prev, "new", [msg("1", "n")], {
      modelId: "m1",
    });
    expect(next.map((s) => s.id)).toEqual(["new", "old"]);
  });
});
