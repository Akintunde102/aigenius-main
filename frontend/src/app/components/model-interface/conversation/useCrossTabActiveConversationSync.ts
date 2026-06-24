"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

type RouteConversationId = string | null;

type SyncMessage = {
  type: "active-conversation";
  tabId: string;
  conversationId: RouteConversationId;
};

const CHANNEL_NAME = "aigenius-active-conversation";

function toPath(conversationId: RouteConversationId): string {
  return conversationId ? `/chat/${conversationId}` : "/";
}

/**
 * Optional cross-tab active conversation synchronization.
 * Disabled by default; enable with NEXT_PUBLIC_MULTI_CHAT_SYNC_TABS=1.
 */
export function useCrossTabActiveConversationSync(
  routeConversationId: RouteConversationId,
): void {
  const router = useRouter();
  const tabIdRef = useRef(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );
  const channelRef = useRef<BroadcastChannel | null>(null);

  const enabled = useMemo(
    () => process.env.NEXT_PUBLIC_MULTI_CHAT_SYNC_TABS === "1",
    [],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || !("BroadcastChannel" in window)) {
      return;
    }
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      const payload = event.data;
      if (!payload || payload.type !== "active-conversation") {
        return;
      }
      if (payload.tabId === tabIdRef.current) {
        return;
      }
      const nextPath = toPath(payload.conversationId ?? null);
      if (window.location.pathname !== nextPath) {
        router.push(nextPath);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [enabled, router]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    channelRef.current?.postMessage({
      type: "active-conversation",
      tabId: tabIdRef.current,
      conversationId: routeConversationId ?? null,
    } satisfies SyncMessage);
  }, [enabled, routeConversationId]);
}
