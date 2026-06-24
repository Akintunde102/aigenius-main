"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/app/components/BrandLogo";
import { Button } from "@/app/components/ui/button";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
import { LINKS } from "@/lib/links";
import {
  hasAuthSession,
  syncAuthSessionCookiesFromStorage,
} from "@/lib/utils/auth-session";
import { DESKTOP_SHELL_ENTRY_QUERY_PARAM } from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

/**
 * Public desktop entry (no Electron bridge check, no redirect to web `/login`).
 * Electron may still prefer `/desktop-login` as the first URL; this route stays for bookmarks and dev.
 */
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
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(120,119,198,0.14),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.12),transparent_42%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_35%,black,transparent)]"
        aria-hidden
      />

      <header className="relative z-10 flex flex-col items-center justify-center gap-1 border-b border-white/5 px-6 py-5">
        <BrandLogo size="compact" asStatic />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Desktop
        </p>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-md flex-col justify-center px-6 py-12">
        <section className="rounded-3xl border border-white/10 bg-zinc-900/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-10">
          <h1 className="text-center text-3xl font-semibold text-zinc-50">
            Welcome
          </h1>
          <p className="mt-3 text-center text-sm text-zinc-300">
            Sign in to continue in your desktop workspace.
          </p>

          <Button
            type="button"
            onClick={() => {
              window.location.href = LINKS.googleLogin;
            }}
            className="mt-8 h-12 w-full rounded-xl bg-white text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-zinc-500">
            <Link
              prefetch
              href={`/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`}
              className={cn(
                "font-medium text-emerald-400/90 underline decoration-emerald-500/35 underline-offset-4 hover:text-emerald-300",
                FOCUS_RING,
              )}
            >
              Full desktop sign-in
            </Link>
            <span className="mx-2 text-zinc-600" aria-hidden>
              ·
            </span>
            <Link
              prefetch
              href="/login"
              className={cn(
                "font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200",
                FOCUS_RING,
              )}
            >
              Web sign-in
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
