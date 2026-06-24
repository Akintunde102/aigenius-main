"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { cn } from "@/lib/utils";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { scheduleChatShellPrefetch } from "@/lib/chat-shell-prefetch";
import { hasAuthSession } from "@/lib/utils/auth-session";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";

function PublicNavLinks({
  className,
  onNavigate,
  layout = "row",
}: {
  className?: string;
  onNavigate?: () => void;
  layout?: "row" | "stack";
}) {
  const linkWrap =
    layout === "stack"
      ? "flex w-full flex-col gap-1"
      : "flex flex-wrap items-center gap-x-5 gap-y-2 text-sm";

  return (
    <nav aria-label="Public navigation" className={cn(linkWrap, className)}>
      <Link
        prefetch
        href="/published-conversations"
        onClick={onNavigate}
        className={cn(
          layout === "stack" &&
          "rounded-lg px-3 py-2.5 text-zinc-200 transition hover:bg-white/5 hover:text-white active:scale-[0.99]",
          layout !== "stack" &&
          "text-zinc-300 transition-colors hover:text-white py-1.5 px-3 active:scale-[0.99] font-medium",
          FOCUS_RING,
        )}
      >
        Conversations
      </Link>
      <Link
        prefetch
        href="/signup"
        onClick={onNavigate}
        className={cn(
          layout === "stack" &&
          "rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-3 py-2.5 text-center font-medium text-white shadow-md shadow-cyan-900/40 active:scale-[0.99]",
          layout !== "stack" &&
          "rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-1.5 font-medium text-white shadow-md shadow-cyan-900/30 hover:shadow-cyan-900/50 transition-all hover:brightness-105 active:scale-[0.99]",
          FOCUS_RING,
        )}
      >
        Sign up
      </Link>
      <Link
        prefetch
        href="/login"
        onClick={onNavigate}
        className={cn(
          layout === "stack" &&
          "rounded-lg border border-zinc-600 px-3 py-2.5 text-center text-zinc-100 transition hover:border-cyan-400/50 hover:bg-white/5 active:scale-[0.99]",
          layout !== "stack" &&
          "rounded-lg border border-zinc-700 px-4 py-1.5 text-zinc-200 font-medium transition-all hover:border-zinc-500 hover:bg-white/5 active:scale-[0.99]",
          FOCUS_RING,
        )}
      >
        Sign in
      </Link>
    </nav>
  );
}

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

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <>
      <PrefetchPublicNavRoutes />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md">
        <div className="relative z-[60] mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
          <BrandLogo size="default" />
          <PublicNavLinks className="hidden md:flex" />
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-lg border border-zinc-600 p-2 text-zinc-200 transition hover:border-cyan-400/50 hover:bg-white/5 md:hidden",
              FOCUS_RING,
            )}
            aria-expanded={mobileOpen}
            aria-controls="public-mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden />
            ) : (
              <Menu className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
        {mobileOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-x-0 bottom-0 top-14 z-40 bg-black/50 md:hidden"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <div
              id="public-mobile-nav"
              className="relative z-50 border-t border-white/10 bg-zinc-950/98 px-4 py-4 shadow-lg md:hidden"
            >
              <PublicNavLinks
                layout="stack"
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </>
        ) : null}
      </header>
    </>
  );
}
