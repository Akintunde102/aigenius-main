"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { scheduleChatShellPrefetch } from "@/lib/chat-shell-prefetch";
import { hasAuthSession } from "@/lib/utils/auth-session";

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
  useEffect(() => {
    const html = document.documentElement;
    const stored = localStorage.getItem("aigenius-theme");
    if (stored === "light" || stored === "dark") {
      html.setAttribute("data-theme", stored);
    } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
      html.setAttribute("data-theme", "light");
    } else {
      html.setAttribute("data-theme", "dark");
    }
  }, []);
  return null;
}

export function PublicHeader() {
  const toggleTheme = () => {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("aigenius-theme", next);
  };
  return (
    <>
      <PrefetchPublicNavRoutes />
      <nav className="nav">
        <Link href="/" className="nav-logo">
          <span className="nav-logo-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          <span className="nav-logo-text">AIGenius</span>
        </Link>
        <div className="nav-links">
          <Link prefetch href="/docs">About</Link>
          <Link prefetch href="/login" className="nav-signin">Sign in</Link>
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