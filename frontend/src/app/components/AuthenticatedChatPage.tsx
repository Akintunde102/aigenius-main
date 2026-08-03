"use client";
/**
 * Persistent wrapper for the chat layout: OAuth token-in-URL handling, storage init,
 * and dynamic load of ModelInterface with routeConversationId from useParams.
 * @see ModelInterface — actual chat UI once authenticated
 */
import React, { useEffect, useLayoutEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import HomePage from "@/app/components/HomePage";
import { initializeChatStorage } from "@/lib/utils/chatStorageInit";
import "@/lib/utils/chatStorageUtils";
import { hasAuthSession } from "@/lib/utils/auth-session";
import { exchangeOAuthAccessTokenForSession } from "@/lib/utils/oauth-connection-token";
import { useCrossTabActiveConversationSync } from "@/app/components/model-interface/conversation/useCrossTabActiveConversationSync";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { ChatShellLoadingSkeleton } from "@/app/components/ChatShellLoadingSkeleton";
import { importModelInterfaceWithRetry } from "@/app/components/model-interface/modelInterfaceDynamicImport";
import { AllProviders } from "@/app/components/model-interface/contexts";
import { ToolApprovalProvider } from "@/lib/tool-permissions/ToolApprovalProvider";

const ModelInterface = dynamic(importModelInterfaceWithRetry, {
  ssr: false,
  loading: () => <ChatShellLoadingSkeleton />,
});

interface AuthenticatedChatPageProps {
  /** @deprecated Use the URL-aware version. This prop is kept for backwards compatibility only. */
  initialConversationId?: string | null;
}

export default function AuthenticatedChatPage({
  initialConversationId = null,
}: AuthenticatedChatPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ conversationId?: string }>();
  const routeConversationId = params?.conversationId ?? initialConversationId ?? null;
  useCrossTabActiveConversationSync(routeConversationId);

  const tokenInUrl = searchParams.get("token");
  const redirectPath = routeConversationId
    ? `/chat/${routeConversationId}`
    : "/";

  const redirectPathRef = React.useRef(redirectPath);
  redirectPathRef.current = redirectPath;

  // Keep SSR and the first client paint identical; resolve auth in useLayoutEffect only.
  const [authReady, setAuthReady] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    void initializeChatStorage();

    if (!tokenInUrl) {
      if (hasAuthSession()) {
        setToken("authenticated");
      }
      setLoading(false);
      setAuthReady(true);
      return;
    }

    setLoading(true);
    const getAuthConnectionToken = async () => {
      try {
        const ok = await exchangeOAuthAccessTokenForSession(tokenInUrl);
        if (!ok) {
          setLoading(false);
          setAuthReady(true);
          return;
        }

        setToken("authenticated");
        setLoading(false);
        setAuthReady(true);

        // Clear previous user's local caches/IndexedDB before redirecting to the new session
        import('@/lib/utils/chatStorage').then(({ clearChatStorage }) => {
            void clearChatStorage().catch((err) => console.error("Failed to clear chat IndexedDB storage:", err));
        });
        localStorage.removeItem('aigenius-active-code-project-v1');
        localStorage.removeItem('aigenius-active-editor-context-v1');
        localStorage.removeItem('aigenius-conversation-scroll-state-v1');

        window.location.replace(redirectPathRef.current);
      } catch (error) {
        console.error("Error getting auth connection token:", error);
        setLoading(false);
        setAuthReady(true);
      }
    };

    void getAuthConnectionToken();
  }, [tokenInUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tokenInUrl) return;
    if (hasAuthSession()) {
      void importModelInterfaceWithRetry();
    }
  }, [tokenInUrl]);

  useEffect(() => {
    if (!token) return;
    prefetchPublicRoutes(router);
  }, [token, router]);

  if (!authReady || loading) {
    return <ChatShellLoadingSkeleton />;
  }

  if (token) {
    return (
      <ToolApprovalProvider>
        <AllProviders>
          <ModelInterface routeConversationId={routeConversationId} />
        </AllProviders>
      </ToolApprovalProvider>
    );
  }

  return <HomePage />;
}
