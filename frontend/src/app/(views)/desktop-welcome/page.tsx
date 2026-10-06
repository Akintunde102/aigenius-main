"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  DESKTOP_PRIMARY_BUTTON,
  DESKTOP_TEXT_LINK,
  DesktopAuthFrame,
  DesktopAuthHeading,
  DesktopTrustRow,
} from "@/app/components/auth/DesktopAuthFrame";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";
import { LINKS } from "@/lib/links";

const DESKTOP_SHELL_ENTRY_QUERY_PARAM = 'desktop';

export default function DesktopWelcomePage() {
  const pathname = usePathname();
  const didSessionRedirectRef = useRef(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (!params.has(DESKTOP_SHELL_ENTRY_QUERY_PARAM)) {
        return;
      }
      params.delete(DESKTOP_SHELL_ENTRY_QUERY_PARAM);
      const q = params.toString();
      const path = `${window.location.pathname}${q ? `?${q}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", path);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!hasAuthSession()) {
      return;
    }
    if (didSessionRedirectRef.current) {
      return;
    }
    didSessionRedirectRef.current = true;
    syncAuthSessionCookiesFromStorage();
    const target = resolveAuthenticatedDesktopShellRedirect(
      pathname,
      window.location.search,
    );
    window.location.assign(target);
  }, [pathname]);

  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <DesktopAuthFrame>
        <DesktopAuthHeading title="Welcome" subtitle="Sign in to continue in your desktop workspace." />

        <div className="mt-8 w-full max-w-xs">
          <button
            type="button"
            onClick={() => {
              window.location.href = LINKS.googleLogin;
            }}
            className={DESKTOP_PRIMARY_BUTTON}
          >
            Continue with Google
          </button>
        </div>

        <p className="mt-6 text-sm text-lp-muted">
          <Link prefetch href={`/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`} className={`text-lp-fg ${DESKTOP_TEXT_LINK}`}>
            Full desktop sign-in
          </Link>
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link prefetch href="/login" className={DESKTOP_TEXT_LINK}>
            Web sign-in
          </Link>
        </p>

        <DesktopTrustRow />
      </DesktopAuthFrame>
    </PublicPageShell>
  );
}