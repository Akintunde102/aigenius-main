"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  desktopUrlIndicatesStoredSession,
  ensureGatewayAuthReady,
  getValidAccessToken,
} from "@/lib/api/auth-client";
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { readDesktopStoredRefreshToken } from "@/lib/utils/desktop-auth-refresh";
import {
  DESKTOP_SHELL_ENTRY_QUERY_PARAM,
  getDesktopShellEntryRuntimeResolveOptions,
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  isLikelyElectronRenderer,
  resolveAigeniusDesktopRuntime,
  waitForAigeniusDesktopBridge,
} from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

const SESSION_RESTORE_TIMEOUT_MS = 15_000;
const KEYCHAIN_ONLY_BRIDGE_WAIT_MS = 800;

/** Dev compiles already sit on the route loading shell. Do not cover the sign-in form again. */
const blockUiOnRestore = process.env.NODE_ENV !== 'development';

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

function localSessionMarkersPresent(): boolean {
  return hasAuthSession() || desktopUrlIndicatesStoredSession();
}

async function ensureGatewayAuthReadyWithTimeout(): Promise<void> {
  await Promise.race([
    ensureGatewayAuthReady(),
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("desktop session restore timed out")),
        SESSION_RESTORE_TIMEOUT_MS,
      );
    }),
  ]);
}

/**
 * On desktop cold start, restore access JWT from the main-process refresh token (or HttpOnly
 * cookie on web) before showing the sign-in form.
 */
export function useDesktopSessionRestore(): { restoring: boolean } {
  const pathname = usePathname();
  // Production starts true so SSR matches the first paint. Dev shows sign-in immediately.
  const [restoring, setRestoring] = useState(blockUiOnRestore);

  useEffect(() => {
    if (!isLikelyDesktopShellEntry()) {
      setRestoring(false);
      return;
    }

    let cancelled = false;

    const run = async () => {
      if (blockUiOnRestore) {
        setRestoring(true);
      }

      const expectStoredSession = localSessionMarkersPresent();
      const shellOptions = getDesktopShellEntryRuntimeResolveOptions({
        expectStoredSession,
      });
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

      if (!expectStoredSession) {
        if (!isAigeniusDesktopRuntime()) {
          await waitForAigeniusDesktopBridge(KEYCHAIN_ONLY_BRIDGE_WAIT_MS);
        }
        const refreshToken = await readDesktopStoredRefreshToken();
        if (!refreshToken) {
          if (!cancelled) {
            setRestoring(false);
          }
          return;
        }
      }

      try {
        await ensureGatewayAuthReadyWithTimeout();
      } catch {
        // Desktop cold-boot refresh failed (e.g. upstream unreachable at startup).
        // Show the login screen rather than redirecting with a stale/expired token.
        if (!cancelled) {
          setRestoring(false);
        }
        return;
      }
      if (cancelled) {
        return;
      }

      const token = getValidAccessToken();
      if (token) {
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
