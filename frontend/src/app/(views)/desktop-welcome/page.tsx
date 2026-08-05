"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BotMessageSquare, Mic, Wallet } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { Button } from "@/app/components/ui/button";
import { LandingAmbientBackground } from "@/app/components/ui";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { cn } from "@/lib/utils";
import { LINKS } from "@/lib/links";
import {
  hasAuthSession,
  syncAuthSessionCookiesFromStorage,
} from "@/lib/utils/auth-session";
import { DESKTOP_SHELL_ENTRY_QUERY_PARAM } from "@/lib/utils/desktop-runtime";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const EASE = [0.22, 1, 0.36, 1] as const;

const TRUST_ITEMS = [
  { icon: BotMessageSquare, label: "Every top model" },
  { icon: Mic, label: "Voice dictation" },
  { icon: Wallet, label: "Pay as you go" },
] as const;

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

  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-zinc-100">
      <LandingAmbientBackground />

      <header className="relative z-10 flex flex-col items-center justify-center gap-1 border-b border-white/[0.06] px-6 py-5">
        <BrandLogo size="compact" asStatic />
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          Desktop
        </p>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-4.25rem)] max-w-md flex-col justify-center px-6 py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={reduce ? undefined : container}
        >
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-cyan-500/[0.12] via-transparent to-emerald-500/[0.12] blur-2xl"
            />

            <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 p-8 shadow-2xl shadow-black/50 sm:p-10">
              <div
                aria-hidden
                className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
              />

              <motion.div variants={reduce ? undefined : fadeUp} transition={{ duration: 0.5, ease: EASE }} className="relative flex justify-center">
                <BrandLogo size="default" asStatic />
              </motion.div>

              <motion.h1
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-6 text-center text-2xl font-semibold tracking-tight text-white sm:text-3xl"
              >
                Welcome
              </motion.h1>
              <motion.p
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-2 text-center text-sm text-zinc-400 sm:text-base"
              >
                Sign in to continue in your desktop workspace.
              </motion.p>

              <motion.div variants={reduce ? undefined : fadeUp} transition={{ duration: 0.5, ease: EASE }} className="relative">
                <Button
                  type="button"
                  onClick={() => {
                    window.location.href = LINKS.googleLogin;
                  }}
                  className="mt-8 h-12 w-full rounded-xl bg-white text-[15px] font-semibold text-zinc-900 shadow-lg shadow-cyan-950/30 hover:bg-zinc-100"
                >
                  Continue with Google
                </Button>
              </motion.div>

              <motion.p
                variants={reduce ? undefined : fadeUp}
                transition={{ duration: 0.5, ease: EASE }}
                className="relative mt-6 text-center text-sm text-zinc-500"
              >
                <Link
                  prefetch
                  href={`/desktop-login?${DESKTOP_SHELL_ENTRY_QUERY_PARAM}=1`}
                  className={cn(
                    "font-medium text-cyan-300 underline decoration-cyan-500/40 underline-offset-4 transition hover:text-cyan-200",
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
                    "font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-2 transition hover:text-zinc-200",
                    FOCUS_RING,
                  )}
                >
                  Web sign-in
                </Link>
              </motion.p>
            </section>
          </div>

          <motion.ul
            variants={reduce ? undefined : fadeUp}
            transition={{ duration: 0.5, ease: EASE }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-zinc-500"
          >
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-cyan-400/70" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </main>
    </div>
  );
}
