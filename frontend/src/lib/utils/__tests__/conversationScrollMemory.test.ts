import {
  buildConversationMessageSignature,
  clearAllConversationScrollState,
  clearConversationScrollState,
  getConversationScrollState,
  getStaleConversationIds,
  saveConversationScrollState,
  shouldAcceptRemoteConversationSync,
} from "../conversationScrollMemory";
import type { ChatMessage } from "@/app/components/model-interface/shared/types";

function createMessage(
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    id: overrides.id ?? `msg-${Math.random()}`,
    role: overrides.role ?? "user",
    content: overrides.content ?? "content",
    timestamp: overrides.timestamp ?? Date.now(),
    ...overrides,
  };
}

describe("conversationScrollMemory", () => {
  beforeEach(() => {
    const store = new Map<string, string>();

    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
      configurable: true,
    });

    clearAllConversationScrollState();
  });

  afterEach(() => {
    clearAllConversationScrollState();
  });

  it("buildConversationMessageSignature ignores system messages and tracks visible tail state", () => {
    const signature = buildConversationMessageSignature([
      createMessage({ id: "system-1", role: "system", timestamp: 1 }),
      createMessage({ id: "user-1", role: "user", timestamp: 2 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 3 }),
    ]);

    expect(signature).toBe("2:assistant-1:3:assistant");
  });

  it("returns an empty-tail signature for conversations without visible messages", () => {
    const signature = buildConversationMessageSignature([
      createMessage({ id: "system-1", role: "system", timestamp: 1 }),
    ]);

    expect(signature).toBe("0:::");
  });

  it("shouldAcceptRemoteConversationSync only merges when the server is strictly ahead", () => {
    const local = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 2 }),
    ];
    const equalCountServer = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 99, content: "edited" }),
    ];
    const aheadServer = [
      ...local,
      createMessage({ id: "assistant-2", role: "assistant", timestamp: 3 }),
    ];

    expect(shouldAcceptRemoteConversationSync(local, local)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, equalCountServer)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, aheadServer)).toBe(true);
  });

  it("persists and restores scroll state per conversation", () => {
    saveConversationScrollState("conversation-a", {
      scrollTop: 480,
      messageSignature: "3:last:99:assistant",
    });

    expect(getConversationScrollState("conversation-a")).toEqual({
      scrollTop: 480,
      messageSignature: "3:last:99:assistant",
    });
  });

  it("clears a single conversation scroll state without touching others", () => {
    saveConversationScrollState("conversation-a", {
      scrollTop: 120,
      messageSignature: "1:a:1:user",
    });
    saveConversationScrollState("conversation-b", {
      scrollTop: 240,
      messageSignature: "1:b:2:user",
    });

    clearConversationScrollState("conversation-a");

    expect(getConversationScrollState("conversation-a")).toBeNull();
    expect(getConversationScrollState("conversation-b")).toEqual({
      scrollTop: 240,
      messageSignature: "1:b:2:user",
    });
  });

  it("identifies only inactive conversations whose signatures changed", () => {
    const staleIds = getStaleConversationIds({
      previousSignatures: {
        "conversation-a": "1:a:1:user",
        "conversation-b": "2:b:2:assistant",
        "conversation-c": "1:c:3:user",
      },
      nextSignatures: {
        "conversation-a": "1:a:1:user",
        "conversation-b": "3:b2:4:assistant",
        "conversation-c": "2:c2:5:assistant",
      },
      activeConversationId: "conversation-c",
    });

    expect(staleIds).toEqual(["conversation-b"]);
  });

  it("does not mark brand-new conversations as stale", () => {
    const staleIds = getStaleConversationIds({
      previousSignatures: {
        "conversation-a": "1:a:1:user",
      },
      nextSignatures: {
        "conversation-a": "1:a:1:user",
        "conversation-b": "1:b:2:user",
      },
      activeConversationId: null,
    });

    expect(staleIds).toEqual([]);
  });
});
