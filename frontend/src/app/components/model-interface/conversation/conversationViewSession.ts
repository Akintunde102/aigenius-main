/**
 * Resolves which conversation the main pane is showing.
 *
 * `activeRouteConversationId` is client-authoritative and may diverge from the
 * Next.js `routeConversationId` prop while navigation is in flight (invariant I1).
 * While the user is entering draft mode (New Chat), `pendingDraft` forces the
 * draft slot until session state clears.
 */

export type ConversationTargetState = {
  pendingDraft: boolean;
  activeRouteConversationId: string | null;
  routeTargetInitialized: boolean;
};

export const conversationTargetRef: { current: ConversationTargetState } = {
  current: {
    pendingDraft: false,
    activeRouteConversationId: null,
    routeTargetInitialized: false,
  },
};

export function setPendingDraftMode(pending: boolean): void {
  conversationTargetRef.current.pendingDraft = pending;
}

export function isPendingDraftMode(): boolean {
  return conversationTargetRef.current.pendingDraft;
}

export function setActiveRouteConversationTarget(id: string | null): void {
  conversationTargetRef.current.activeRouteConversationId = id;
  conversationTargetRef.current.routeTargetInitialized = true;
}

export function resolveViewSessionId(
  routeConversationId: string | null,
  currentSessionId: string | null,
): string | null {
  if (conversationTargetRef.current.pendingDraft) {
    return null;
  }

  const routeId = conversationTargetRef.current.routeTargetInitialized
    ? conversationTargetRef.current.activeRouteConversationId
    : routeConversationId;

  if (routeId !== null) {
    return routeId;
  }

  // New Chat clears the client route target synchronously; do not resurrect a stale
  // currentSessionId while the URL/view is in draft mode.
  if (conversationTargetRef.current.routeTargetInitialized) {
    return null;
  }

  return currentSessionId;
}
