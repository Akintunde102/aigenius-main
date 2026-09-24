"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { scheduleChatShellPrefetch } from "@/lib/chat-shell-prefetch";
import { hasAuthSession } from "@/lib/utils/auth-session";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import {
  applyResolvedColorMode,
  COLOR_MODE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
} from "@/lib/color-mode";

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

export function PublicHeader() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [label, setLabel] = useState("Open app");

  useEffect(() => {
    const session = readPublicHeaderSession();
    setSignedIn(session.signedIn);
    setLabel(session.label);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, next);
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyResolvedColorMode(next);
  };

  const signInHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <>
      <PrefetchPublicNavRoutes />
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-md shadow-cyan-900/40 transition-transform group-hover:scale-105">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden={true}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <span className="nav-logo-text">AIGenius</span>
        </Link>
        <div className="nav-links">
          <Link prefetch href="/docs">About</Link>
          {signedIn ? (
            <Link prefetch href="/" className="nav-signin">{label}</Link>
          ) : (
            <Link prefetch href={signInHref} className="nav-signin">Sign in</Link>
          )}
          <button type="button" className="theme-toggle" aria-label="Toggle theme" onClick={toggleTheme}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden={true}>
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          </button>
        </div>
      </nav>
    </>
  );
}
