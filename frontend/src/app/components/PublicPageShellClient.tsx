"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BUTTON_PRIMARY, BUTTON_SIZE, BUTTON_TONAL, PRESS } from "@/app/components/landing/constants";
import { Logo } from "@/app/components/landing/Logo";
import { ThemeToggle } from "@/app/components/landing/ThemeToggle";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { scheduleChatShellPrefetch } from "@/lib/chat-shell-prefetch";
import { hasAuthSession } from "@/lib/utils/auth-session";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";

function PrefetchPublicNavRoutes() {
  const router = useRouter();
  useEffect(() => {
    prefetchPublicRoutes(router);
    if (hasAuthSession()) {
      scheduleChatShellPrefetch(router);
    }
  }, [router]);
  return null;
}

export function ThemeInitializer() {
  return null;
}

function readPublicHeaderSession(): { signedIn: boolean; label: string } {
  if (typeof window === "undefined") {
    return { signedIn: false, label: "Open app" };
  }
  const user = getStoredUserDetailsSnapshot<{ firstName?: string | null }>();
  const signedIn = hasAuthSession() || Boolean(user);
  const firstName = user?.firstName?.trim();
  return { signedIn, label: firstName || "Open app" };
}

/**
 * Same behaviour as before (route prefetching, signed-in label, sign-in link that remembers the
 * current path, theme toggle). Only the markup and styling are new. The theme toggle is the landing
 * page's ThemeToggle, which runs the identical localStorage + applyResolvedColorMode logic.
 */
export function PublicHeader() {
  const { t, openLanguageModal } = useLanguage();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [label, setLabel] = useState("Open app");

  useEffect(() => {
    const session = readPublicHeaderSession();
    setSignedIn(session.signedIn);
    setLabel(session.label);
  }, []);

  const signInHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <>
      <PrefetchPublicNavRoutes />
      <header className="sticky top-0 z-40 bg-lp-glass backdrop-blur-md">
        <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <div className="flex items-center gap-1.5">
            <Link
              prefetch
              href="/docs"
              className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm text-lp-muted hover:text-lp-fg ${PRESS}`}
            >
              About
            </Link>
            {signedIn ? (
              <Link prefetch href="/" className={`${BUTTON_PRIMARY} ${BUTTON_SIZE.sm} ${PRESS}`}>
                {label}
              </Link>
            ) : (
              <Link prefetch href={signInHref} className={`${BUTTON_TONAL} ${BUTTON_SIZE.sm} ${PRESS}`}>
                Sign in
              </Link>
            )}
            <ThemeToggle />
          </div>
        </nav>
      </header>
    </>
  );
}