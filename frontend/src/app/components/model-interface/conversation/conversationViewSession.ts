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

/**
 * Draft generation counter. Every time the draft slot is reset (New Chat),
 * the epoch bumps. In-flight draft sends capture the epoch at dispatch time so
 * completion callbacks can tell "my draft" apart from "a newer draft" —
 * `null === null` view comparison alone cannot distinguish two drafts.
 */
let draftConversationEpoch = 0;

export function bumpDraftConversationEpoch(): void {
  draftConversationEpoch += 1;
}

export function getDraftConversationEpoch(): number {
  return draftConversationEpoch;
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

  return currentSessionId;
}
