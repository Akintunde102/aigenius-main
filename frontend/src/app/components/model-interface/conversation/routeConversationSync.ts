/**
 * Pure logic for syncing Next.js `routeConversationId` prop into ModelInterface's
 * `activeRouteConversationId` without fighting client-led navigation.
 *
 * Invariant (I1): only react when the *prop* value changes, not when internal
 * state temporarily differs from a stale prop (e.g. after sidebar click, before router.push).
 */
export type RouteConversationId = string | null;

export type RoutePropSyncResult =
  | { kind: "unchanged"; lastSyncedProp: RouteConversationId }
  | { kind: "changed"; lastSyncedProp: RouteConversationId; nextActiveId: RouteConversationId };

/**
 * Compares the incoming route prop to the last synced value.
 * When `kind === "changed"`, the caller should set active conversation id to `nextActiveId`
 * and store `lastSyncedProp` in a ref.
 */
export function computeRoutePropSync(
  lastSyncedProp: RouteConversationId,
  incomingProp: RouteConversationId,
): RoutePropSyncResult {
  if (incomingProp === lastSyncedProp) {
    return { kind: "unchanged", lastSyncedProp };
  }
  return {
    kind: "changed",
    lastSyncedProp: incomingProp,
    nextActiveId: incomingProp,
  };
}
