import { useEffect, useRef } from "react";
import {
  computeRoutePropSync,
  type RouteConversationId,
} from "./routeConversationSync";

/**
 * Keeps internal active conversation id aligned with URL-derived prop updates only.
 * See docs/MULTI_CHAT_ARCHITECTURE_ROADMAP.md invariant I1.
 */
export function useSyncRouteConversationId(
  routeConversationId: RouteConversationId,
  setActiveRouteConversationId: (id: RouteConversationId) => void,
): void {
  const lastSyncedPropRef = useRef<RouteConversationId>(routeConversationId);

  useEffect(() => {
    const result = computeRoutePropSync(
      lastSyncedPropRef.current,
      routeConversationId,
    );
    if (result.kind === "unchanged") {
      return;
    }
    lastSyncedPropRef.current = result.lastSyncedProp;
    setActiveRouteConversationId(result.nextActiveId);
  }, [routeConversationId, setActiveRouteConversationId]);
}
