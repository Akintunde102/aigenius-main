/**
 * Classifies the route-orchestrator “null URL target” branch for multi-chat.
 * Used by ModelInterface when `activeRouteConversationId === null`.
 *
 * See docs/MULTI_CHAT_ARCHITECTURE_ROADMAP.md (T2).
 */

export type NullRouteOrchestratorAction =
  | { kind: "wait"; reason: "pending_draft_until_session_null" }
  | { kind: "clear_pending_draft_marker" }
  | { kind: "reset_stale_session_on_root" }
  | { kind: "noop"; reason: "root_clean" }
  | { kind: "align_route_to_open_session"; sessionId: string };

export type NullRouteOrchestratorContext = {
  currentSessionId: string | null;
  pendingDraftMode: boolean;
  pathnameIsRoot: boolean;
};

/**
 * Pure decision for `activeRouteConversationId === null` handling.
 * Caller applies side effects (reset state, setRoute id, etc.).
 */
export function reduceNullRouteOrchestration(
  ctx: NullRouteOrchestratorContext,
): NullRouteOrchestratorAction {
  if (ctx.pendingDraftMode) {
    if (ctx.currentSessionId !== null) {
      return { kind: "wait", reason: "pending_draft_until_session_null" };
    }
    return { kind: "clear_pending_draft_marker" };
  }

  if (ctx.pathnameIsRoot) {
    if (ctx.currentSessionId !== null) {
      return { kind: "reset_stale_session_on_root" };
    }
    return { kind: "noop", reason: "root_clean" };
  }

  if (ctx.currentSessionId !== null) {
    return {
      kind: "align_route_to_open_session",
      sessionId: ctx.currentSessionId,
    };
  }

  return { kind: "noop", reason: "root_clean" };
}
