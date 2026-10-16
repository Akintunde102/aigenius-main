import {
  buildConversationMessageSignature,
  clearAllConversationScrollState,
  clearConversationScrollState,
  getConversationScrollState,
  getStaleConversationIds,
  localMessagesMatchServerPrefix,
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
    const behindServer = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
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
    expect(shouldAcceptRemoteConversationSync(local, behindServer)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, equalCountServer)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, aheadServer)).toBe(true);
  });

  it("accepts streamed text written into the same assistant message", () => {
    const local = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory",
        events: [{ type: "text", content: "I'll inventory" }],
      }),
    ];
    const streamed = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory the projects folder.",
        events: [{ type: "text", content: "I'll inventory the projects folder." }],
      }),
    ];

    expect(shouldAcceptRemoteConversationSync(local, streamed)).toBe(true);
  });

  it("accepts a tool event appended to the same assistant message", () => {
    const local = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory the projects folder.",
        events: [{ type: "text", content: "I'll inventory the projects folder." }],
      }),
    ];
    const withTool = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory the projects folder.",
        events: [
          { type: "text", content: "I'll inventory the projects folder." },
          {
            type: "tool",
            tool: "local_list_directory",
            displayName: "List directory",
            arguments: { path: "C:\\projects" },
            logs: [],
            loading: false,
            success: true,
            result: "13 directories",
            timestamp: 3,
          },
        ],
      }),
    ];

    expect(shouldAcceptRemoteConversationSync(local, withTool)).toBe(true);
  });

  it("rejects a shorter or divergent assistant snapshot on the same message", () => {
    const local = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory the projects folder.",
        events: [{ type: "text", content: "I'll inventory the projects folder." }],
      }),
    ];
    const shorter = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll",
        events: [{ type: "text", content: "I'll" }],
      }),
    ];
    const divergent = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "Analyze the folder" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "A different answer that does not extend the draft.",
        events: [{ type: "text", content: "A different answer that does not extend the draft." }],
      }),
    ];
    const editedUser = [
      createMessage({ id: "user-1", role: "user", timestamp: 1, content: "A different goal" }),
      createMessage({
        id: "assistant-1",
        role: "assistant",
        timestamp: 2,
        content: "I'll inventory the projects folder. Next sentence.",
        events: [{ type: "text", content: "I'll inventory the projects folder. Next sentence." }],
      }),
    ];

    expect(shouldAcceptRemoteConversationSync(local, shorter)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, divergent)).toBe(false);
    expect(shouldAcceptRemoteConversationSync(local, editedUser)).toBe(false);
  });

  it("shouldAcceptRemoteConversationSync rejects replay branches trimmed to a user turn", () => {
    const fullServerThread = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 2 }),
      createMessage({ id: "user-2", role: "user", timestamp: 3 }),
      createMessage({ id: "assistant-2", role: "assistant", timestamp: 4 }),
    ];
    const replaySnapshot = fullServerThread.slice(0, 3);

    expect(shouldAcceptRemoteConversationSync(replaySnapshot, fullServerThread)).toBe(false);
    expect(localMessagesMatchServerPrefix(replaySnapshot, fullServerThread)).toBe(true);
  });

  it("shouldAcceptRemoteConversationSync rejects stale server tails after a branched assistant reply", () => {
    const localAfterReplay = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 2 }),
      createMessage({ id: "user-2", role: "user", timestamp: 3 }),
      createMessage({ id: "assistant-new", role: "assistant", timestamp: 5 }),
    ];
    const staleServer = [
      createMessage({ id: "user-1", role: "user", timestamp: 1 }),
      createMessage({ id: "assistant-1", role: "assistant", timestamp: 2 }),
      createMessage({ id: "user-2", role: "user", timestamp: 3 }),
      createMessage({ id: "assistant-old", role: "assistant", timestamp: 4 }),
      createMessage({ id: "user-3", role: "user", timestamp: 6 }),
    ];

    expect(shouldAcceptRemoteConversationSync(localAfterReplay, staleServer)).toBe(false);
    expect(localMessagesMatchServerPrefix(localAfterReplay, staleServer)).toBe(false);
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
