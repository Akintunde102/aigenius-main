import {
  reduceNullRouteOrchestration,
  type NullRouteOrchestratorContext,
} from "../activeConversationPhase";

describe("reduceNullRouteOrchestration", () => {
  const base = (
    overrides: Partial<NullRouteOrchestratorContext>,
  ): NullRouteOrchestratorContext => ({
    currentSessionId: null,
    pendingDraftMode: false,
    pathnameIsRoot: true,
    ...overrides,
  });

  it("clears pending draft when session is promoted from draft", () => {
    expect(
      reduceNullRouteOrchestration(
        base({ pendingDraftMode: true, currentSessionId: "s1" }),
      ),
    ).toEqual({ kind: "clear_pending_draft_marker" });
  });

  it("waits for root navigation before clearing pending draft", () => {
    expect(
      reduceNullRouteOrchestration(
        base({
          pendingDraftMode: true,
          currentSessionId: null,
          pathnameIsRoot: false,
        }),
      ),
    ).toEqual({
      kind: "wait",
      reason: "pending_draft_until_root_navigation",
    });
  });

  it("clears pending draft when session is null and URL is root", () => {
    expect(
      reduceNullRouteOrchestration(
        base({ pendingDraftMode: true, currentSessionId: null }),
      ),
    ).toEqual({ kind: "clear_pending_draft_marker" });
  });

  it("resets stale session on root when not pending draft", () => {
    expect(
      reduceNullRouteOrchestration(
        base({
          pendingDraftMode: false,
          pathnameIsRoot: true,
          currentSessionId: "s1",
        }),
      ),
    ).toEqual({ kind: "reset_stale_session_on_root" });
  });

  it("noops on clean root", () => {
    expect(
      reduceNullRouteOrchestration(
        base({
          pathnameIsRoot: true,
          currentSessionId: null,
        }),
      ),
    ).toEqual({ kind: "noop", reason: "root_clean" });
  });

  it("aligns route from session when not on root and session exists", () => {
    expect(
      reduceNullRouteOrchestration(
        base({
          pathnameIsRoot: false,
          currentSessionId: "conv-9",
        }),
      ),
    ).toEqual({
      kind: "align_route_to_open_session",
      sessionId: "conv-9",
    });
  });
});
