"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/app/components/BrandLogo";
import { GoogleSignIn } from "@/app/components/auth/GoogleSignIn";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { getStoredUserDetailsSnapshot } from "@/lib/calls/get-logged-user-details";
import { setAccessToken } from "@/lib/api/auth-client";
import { cn } from "@/lib/utils";
import {
  hasAuthSession,
  syncAuthSessionCookiesFromStorage,
} from "@/lib/utils/auth-session";
import { DESKTOP_SHELL_ENTRY_QUERY_PARAM } from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

const CARD_SURFACE =
  "rounded-2xl border border-white/10 bg-zinc-900/90 p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-md sm:rounded-3xl sm:p-10";

/**
 * Desktop-oriented sign-in. Public route: no redirect to web `/login` when the Electron bridge is absent
 * (e.g. opening the URL in a normal browser).
 */
export default function DesktopLoginPage() {
  const pathname = usePathname();
  const didSessionRedirectRef = useRef(false);
  const [storedFirstName, setStoredFirstName] = useState<string | null>(null);

  useEffect(() => {
    try {
      const snap = getStoredUserDetailsSnapshot<Record<string, unknown>>();
      const raw = snap?.firstName;
      const trimmed =
        typeof raw === "string" ? raw.trim() : "";
      setStoredFirstName(trimmed.length > 0 ? trimmed : null);
    } catch {
      setStoredFirstName(null);
    }
  }, []);

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
    /** Full navigation so the next request includes synced cookies (middleware is cookie-only). */
    window.location.assign(target);
  }, [pathname]);

  const headline = storedFirstName
    ? `Welcome back, ${storedFirstName}`
    : "Welcome to AIGenius";

  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-[#0c0d0f] text-zinc-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(16,185,129,0.16),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_30%,rgba(20,184,166,0.12),transparent_50%),radial-gradient(ellipse_60%_40%_at_0%_80%,rgba(71,85,105,0.14),transparent_45%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:48px_48px] opacity-80 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black,transparent)]"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-12">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center text-center">
          <BrandLogo size="compact" asStatic />
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-500/90">
            Desktop
          </p>
        </div>

        <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="mb-8 space-y-3 text-center sm:mb-10">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {headline}
            </h1>
            <p className="mx-auto max-w-md text-pretty text-sm leading-relaxed text-zinc-400 sm:text-base">
              Sign in with Google to use AIGenius on this computer. Your session stays in secure
              storage and app cookies—just like the browser.
            </p>
          </div>

          <section className={CARD_SURFACE}>
            <div className="mt-2 space-y-4">
              <GoogleSignIn
                variant="login"
                className="!h-14 !w-full !rounded-xl !border-zinc-600 !bg-white !text-base !font-medium !text-zinc-900 hover:!border-emerald-400/70 hover:!bg-zinc-50 focus-visible:!ring-2 focus-visible:!ring-emerald-500 focus-visible:!ring-offset-2 focus-visible:!ring-offset-zinc-950"
              />

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                  <span className="bg-zinc-900 px-3 text-zinc-500 font-medium">Alternative</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!window.aigeniusDesktop?.startWebSignIn) {
                    return;
                  }
                  const res = await window.aigeniusDesktop.startWebSignIn();
                  if (res?.token) {
                    setAccessToken(res.token);
                    syncAuthSessionCookiesFromStorage();
                    const target = resolveAuthenticatedDesktopShellRedirect(
                      pathname,
                      window.location.search,
                    );
                    window.location.assign(target);
                  }
                }}
                className={cn(
                  "flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-800/50 text-base font-medium text-white transition-all hover:bg-zinc-800 hover:border-zinc-600 active:scale-[0.98]",
                  FOCUS_RING
                )}
              >
                <svg className="h-5 w-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Sign in with Browser
              </button>
            </div>

            <p className="mt-8 text-center text-sm text-zinc-500">
              <Link
                prefetch
                href="/desktop-welcome"
                className={cn(
                  "font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200",
                  FOCUS_RING,
                )}
              >
                Desktop welcome
              </Link>
              <span className="mx-2 text-zinc-600" aria-hidden>
                ·
              </span>
              <Link
                prefetch
                href="/login"
                className={cn(
                  "font-medium text-emerald-400/90 underline decoration-emerald-500/35 underline-offset-4 hover:text-emerald-300",
                  FOCUS_RING,
                )}
              >
                Web sign-in
              </Link>
            </p>

            <div className="mt-8 border-t border-white/10 pt-6 text-center text-[13px] text-zinc-500">
              <Link
                prefetch
                href="/signup"
                className={cn(
                  "font-medium text-zinc-300 underline decoration-zinc-600 underline-offset-2 hover:text-white",
                  FOCUS_RING,
                )}
              >
                Create an account
              </Link>
              <span className="mx-2 text-zinc-600" aria-hidden>
                ·
              </span>
              <Link
                prefetch
                href="/docs/privacy-policy"
                className={cn(
                  "font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200",
                  FOCUS_RING,
                )}
              >
                Privacy
              </Link>
              <span className="mx-2 text-zinc-600" aria-hidden>
                ·
              </span>
              <Link
                prefetch
                href="/docs/terms-and-conditions"
                className={cn(
                  "font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-200",
                  FOCUS_RING,
                )}
              >
                Terms
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
