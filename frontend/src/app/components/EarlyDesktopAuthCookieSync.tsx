"use client";

import { useLayoutEffect } from "react";
import { primeDesktopGatewayApiRoot } from "@/lib/api/resolve-gateway-api-root";
import { getValidAccessToken, handleSessionExpired } from "@/lib/api/auth-client";
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { syncCodeProjectToDesktop } from "@/lib/code-projects/sync-code-project-to-desktop";
import {
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  resolveAigeniusDesktopRuntime,
} from "@/lib/utils/desktop-runtime";

/**
 * Next middleware only sees cookies; localStorage may already hold tokens after OAuth or a prior session.
 * Runs in `useLayoutEffect` so cookies are aligned before child `useEffect` redirects (avoids
 * `/chat` → `/login` loops when preload is slower than the HTML shell flag).
 */
export default function EarlyDesktopAuthCookieSync(): null {
  useLayoutEffect(() => {
    void primeDesktopGatewayApiRoot();

    const syncDesktopSession = () => {
      if (!hasAuthSession()) {
        return;
      }
      syncAuthSessionCookiesFromStorage();
      void syncCodeProjectToDesktop();
      if (!getValidAccessToken()) {
        handleSessionExpired();
      }
    };

    if (isDesktopShellFromBuild() || isAigeniusDesktopRuntime()) {
      syncDesktopSession();
      return;
    }

    return resolveAigeniusDesktopRuntime((isDesktop) => {
      if (isDesktop) {
        syncDesktopSession();
      }
    });
  }, []);
  return null;
}
