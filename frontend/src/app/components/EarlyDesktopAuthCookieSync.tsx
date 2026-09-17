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
      const validToken = getValidAccessToken();
      // eslint-disable-next-line no-console
      console.warn('[AIG-AUTH] EarlyDesktopAuthCookieSync: hasAuthSession=true validToken=' + !!validToken + ' path=' + (typeof window !== 'undefined' ? window.location.pathname : 'ssr'));
      try {
        const prev = localStorage.getItem('__aig_auth_debug') ?? '';
        const entry = new Date().toISOString() + ' EarlyDesktopAuthCookieSync: hasAuthSession=true validToken=' + !!validToken;
        localStorage.setItem('__aig_auth_debug', (prev + '\n' + entry).slice(-10000));
      } catch { /* ignore */ }
      if (!validToken) {
        // [FIX] Do NOT call handleSessionExpired() here on desktop.
        // An expired access token on cold boot is normal; use-desktop-session-restore
        // will use the desktop refresh token to get a new one. Calling handleSessionExpired
        // here would delete the refresh token from disk before it can be used.
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
