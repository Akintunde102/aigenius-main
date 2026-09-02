"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ensureGatewayAuthReady, getValidAccessToken } from "@/lib/api/auth-client";
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  getDesktopShellEntryRuntimeResolveOptions,
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  isLikelyElectronRenderer,
  resolveAigeniusDesktopRuntime,
} from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

function isLikelyDesktopShellEntry(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (isAigeniusDesktopRuntime() || isDesktopShellFromBuild() || isLikelyElectronRenderer()) {
    return true;
  }
  try {
    const q = new URLSearchParams(window.location.search).get(
      DESKTOP_SHELL_ENTRY_QUERY_PARAM,
    );
    return q === "1" || q === "true";
  } catch {
    return false;
  }
}

/**
 * On desktop cold start, restore access JWT from the main-process refresh token (or HttpOnly
 * cookie on web) before showing the sign-in form.
 */
export function useDesktopSessionRestore(): { restoring: boolean } {
  const pathname = usePathname();
  const [restoring, setRestoring] = useState(() => isLikelyDesktopShellEntry());

  useEffect(() => {
    if (!isLikelyDesktopShellEntry()) {
      setRestoring(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setRestoring(true);

      const shellOptions = getDesktopShellEntryRuntimeResolveOptions();
      const isDesktop = await new Promise<boolean>((resolve) => {
        if (isAigeniusDesktopRuntime()) {
          resolve(true);
          return;
        }
        resolveAigeniusDesktopRuntime(resolve, shellOptions);
      });

      if (cancelled || !isDesktop) {
        setRestoring(false);
        return;
      }

      await ensureGatewayAuthReady();
      if (cancelled) {
        return;
      }

      const token = getValidAccessToken();
      if (token || hasAuthSession()) {
        syncAuthSessionCookiesFromStorage();
        const target = resolveAuthenticatedDesktopShellRedirect(
          pathname,
          window.location.search,
        );
        window.location.replace(target);
        return;
      }

      setRestoring(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return { restoring };
}
