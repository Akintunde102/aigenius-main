"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { DesktopAuthFlowPhase } from "@/app/components/auth/GoogleSignIn";
import { completeDesktopOAuthSession } from "@/lib/utils/complete-desktop-oauth-session";
import { syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import {
  readDesktopAuthFlowPhase,
  writeDesktopAuthFlowPhase,
} from "@/lib/utils/desktop-auth-flow-storage";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

export function useDesktopAuthFlow() {
  const pathname = usePathname();
  const [authFlow, setAuthFlow] = useState<DesktopAuthFlowPhase>(() => readDesktopAuthFlowPhase());
  const [authError, setAuthError] = useState<string | null>(null);
  const completingRef = useRef(false);

  const setAuthFlowWithPersist = useCallback((phase: DesktopAuthFlowPhase) => {
    writeDesktopAuthFlowPhase(phase);
    setAuthFlow(phase);
  }, []);

  const finishOAuthToken = useCallback(async (token: string) => {
    if (completingRef.current) {
      return;
    }
    completingRef.current = true;
    setAuthError(null);
    setAuthFlowWithPersist("completing");
    try {
      const ok = await completeDesktopOAuthSession(token);
      if (!ok) {
        setAuthFlowWithPersist("idle");
        setAuthError(
          "Sign-in succeeded in the browser but the desktop app could not start your session. "
            + "Check that the API is running and try again.",
        );
        return;
      }
      syncAuthSessionCookiesFromStorage();
      writeDesktopAuthFlowPhase("idle");
      const target = resolveAuthenticatedDesktopShellRedirect(
        pathname,
        typeof window !== "undefined" ? window.location.search : "",
      );
      window.location.replace(target);
    } finally {
      completingRef.current = false;
    }
  }, [pathname, setAuthFlowWithPersist]);

  useEffect(() => {
    const bridge = window.aigeniusDesktop;
    if (!bridge?.onOAuthSignInComplete) {
      return;
    }
    return bridge.onOAuthSignInComplete(({ token }: { token: string }) => {
      void finishOAuthToken(token);
    });
  }, [finishOAuthToken]);

  useEffect(() => {
    const bridge = window.aigeniusDesktop;
    if (!bridge?.onMainWindowFocus) {
      return;
    }
    return bridge.onMainWindowFocus(() => {
      const persisted = readDesktopAuthFlowPhase();
      if (persisted === "awaiting-browser") {
        setAuthFlow(persisted);
      }
    });
  }, []);

  return {
    authFlow,
    authError,
    setAuthError,
    setAuthFlowWithPersist,
    finishOAuthToken,
  };
}
