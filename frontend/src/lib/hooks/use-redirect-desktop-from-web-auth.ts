"use client";

import { useEffect } from "react";
import {
  hasAuthSession,
  syncAuthSessionCookiesFromStorage,
} from "@/lib/utils/auth-session";
import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  resolveAigeniusDesktopRuntime,
} from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

/**
 * `/login` and `/signup` are for the browser. The Electron shell uses `/desktop-login`.
 * Preserves `?next=` (and other query) when handing off.
 *
 * If localStorage already has a session but cookies were missing (middleware sent us here),
 * sync cookies and go straight to `?next=` — do not bounce through `/desktop-login` (avoids
 * `/login` ↔ `/desktop-login` loops with the cookie-only middleware).
 */
export function useRedirectDesktopFromWebAuthPage(): void {
  useEffect(() => {
    return resolveAigeniusDesktopRuntime((isDesktop) => {
      if (!isDesktop) {
        return;
      }
      syncAuthSessionCookiesFromStorage();
      if (hasAuthSession()) {
        const target = resolveAuthenticatedDesktopShellRedirect(
          window.location.pathname,
          window.location.search,
        );
        window.location.replace(target);
        return;
      }
      const qs = window.location.search;
      const tail = qs.length > 1 ? `&${qs.slice(1)}` : "";
      window.location.replace(
        `/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1${tail}`,
      );
    });
  }, []);
}
