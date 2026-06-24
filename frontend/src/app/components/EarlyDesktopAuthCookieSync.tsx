"use client";

import { useLayoutEffect } from "react";
import { syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import {
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  resolveAigeniusDesktopRuntime,
} from "@/lib/utils/desktop-runtime";

/**
 * Next middleware only sees cookies; localStorage may already hold tokens after a prior session.
 * Runs in `useLayoutEffect` so cookies are aligned before child `useEffect` redirects (avoids
 * `/chat` → `/login` → shell → `/chat` loops when preload is slower than the HTML shell flag).
 */
export default function EarlyDesktopAuthCookieSync(): null {
  useLayoutEffect(() => {
    if (isDesktopShellFromBuild() || isAigeniusDesktopRuntime()) {
      syncAuthSessionCookiesFromStorage();
      return;
    }
    return resolveAigeniusDesktopRuntime((isDesktop) => {
      if (isDesktop) {
        syncAuthSessionCookiesFromStorage();
      }
    });
  }, []);
  return null;
}
