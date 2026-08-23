"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FOCUS_RING } from "@/app/components/public-page-shell.constants";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";
import { scheduleChatShellPrefetch } from "@/lib/chat-shell-prefetch";
import { hasAuthSession } from "@/lib/utils/auth-session";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "About" },
  { href: "/login", label: "Sign in" },
] as const;

function PrefetchRoutes() {
  const router = useRouter();

  useEffect(() => {
    prefetchPublicRoutes(router);
    if (hasAuthSession()) {
      scheduleChatShellPrefetch(router);
    }
  }, [router]);

  return null;
}

/**
 * Ghost nav links fixed to the top-right — accessible landmark and semantic navigation.
 */
export function HomePageNav() {
  return (
    <>
      <PrefetchRoutes />
      <nav
        aria-label="Main Navigation"
        className="flex items-center justify-end gap-1 px-6 pt-5 sm:px-11 lg:px-14"
      >
        <ul className="flex items-center gap-1 list-none p-0 m-0">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                prefetch
                href={link.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:text-zinc-900 active:scale-[0.99] dark:text-zinc-300 dark:hover:text-white",
                  FOCUS_RING
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
