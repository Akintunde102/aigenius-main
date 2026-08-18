"use client";

import { useLayoutEffect } from "react";
import {
  ensureGatewayAuthReady,
  getValidAccessToken,
} from "@/lib/api/auth-client";
import { canUseDesktopStoredRefreshToken, readDesktopStoredRefreshToken } from "@/lib/utils/desktop-auth-refresh";
import { hasAuthSession } from "@/lib/utils/auth-session";
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
    const syncDesktopSession = async () => {
      if (!hasAuthSession()) {
        if (!canUseDesktopStoredRefreshToken()) {
          return;
        }
        const refreshToken = await readDesktopStoredRefreshToken();
        if (!refreshToken) {
          return;
        }
      }

      await ensureGatewayAuthReady();

      if (!getValidAccessToken()) {
        return;
      }

      void syncCodeProjectToDesktop();
    };

    if (isDesktopShellFromBuild() || isAigeniusDesktopRuntime()) {
      void syncDesktopSession();
      return;
    }

    return resolveAigeniusDesktopRuntime((isDesktop) => {
      if (isDesktop) {
        void syncDesktopSession();
      }
    });
  }, []);
  return null;
}
