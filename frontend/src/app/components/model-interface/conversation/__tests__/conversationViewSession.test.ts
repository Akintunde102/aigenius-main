import {
  conversationTargetRef,
  resolveViewSessionId,
  setActiveRouteConversationTarget,
  setPendingDraftMode,
} from "../conversationViewSession";

describe("resolveViewSessionId", () => {
  beforeEach(() => {
    conversationTargetRef.current = {
      pendingDraft: false,
      activeRouteConversationId: null,
      routeTargetInitialized: false,
    };
  });

  it("returns null while pending draft mode is active", () => {
    setPendingDraftMode(true);
    expect(resolveViewSessionId("conversation-a", "conversation-b")).toBeNull();
  });

  it("prefers the route conversation id when present", () => {
    expect(resolveViewSessionId("conversation-a", "conversation-b")).toBe(
      "conversation-a",
    );
  });

  it("falls back to current session when route is draft root", () => {
    expect(resolveViewSessionId(null, "conversation-new")).toBe(
      "conversation-new",
    );
  });

  it("returns null for a clean new-chat draft", () => {
    expect(resolveViewSessionId(null, null)).toBeNull();
  });

  it("uses the client route target instead of a stale URL prop after New Chat", () => {
    setActiveRouteConversationTarget(null);
    setPendingDraftMode(true);
    expect(resolveViewSessionId("stale-conversation", "stale-conversation")).toBeNull();
  });

  it("keeps the client route target when navigation is ahead of the URL prop", () => {
    setActiveRouteConversationTarget("conversation-b");
    expect(resolveViewSessionId("conversation-a", null)).toBe("conversation-b");
  });
});
