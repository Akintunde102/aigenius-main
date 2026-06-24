"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { FiBook, FiMenu, FiX } from "react-icons/fi";
import { BrandLogo } from "@/app/components/BrandLogo";
import { cn } from "@/lib/utils";
import {
  DOCS_FOCUS,
  DOCS_LINK_CLASS,
  DOCS_PAGE_BG_CLASS,
  DOCS_SHELL_DOCUMENT_BY_PATH,
} from "./docs-shell.constants";
import { prefetchPublicRoutes } from "@/lib/public-route-prefetch";

const DOC_LINKS = [
  { href: "/docs", label: "Overview", description: "Start here" },
  { href: "/docs/privacy-policy", label: "Privacy Policy", description: "Data & privacy" },
  { href: "/docs/terms-and-conditions", label: "Terms of Service", description: "Use of the product" },
] as const;

function DocNavLink({
  href,
  label,
  description,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  description: string;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      prefetch
      href={href}
      onClick={onClick}
      aria-label={`${label}: ${description}`}
      className={cn(
        "group flex w-full min-w-0 flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
        isActive
          ? "border-cyan-200/90 bg-white shadow-[0_2px_8px_-2px_rgba(8,145,178,0.12)] ring-1 ring-cyan-100/80"
          : "border-transparent hover:border-stone-200/90 hover:bg-white/90",
        DOCS_FOCUS,
      )}
    >
      <span
        className={cn(
          "text-sm font-semibold leading-snug tracking-tight",
          isActive ? "text-cyan-900" : "text-stone-800 group-hover:text-stone-900",
        )}
      >
        {label}
      </span>
      <span className="text-xs leading-normal text-stone-500">{description}</span>
    </Link>
  );
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const router = useRouter();
  useEffect(() => {
    prefetchPublicRoutes(router);
  }, [router]);

  const closeSidebar = () => setSidebarOpen(false);
  const shellDoc = DOCS_SHELL_DOCUMENT_BY_PATH[pathname];

  return (
    <div
      className={cn(
        "relative flex h-[100dvh] min-h-0 flex-col overflow-hidden text-stone-900",
        DOCS_PAGE_BG_CLASS,
      )}
    >
      <a
        href="#docs-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-stone-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white focus:ring-2 focus:ring-cyan-400"
      >
        Skip to documentation
      </a>

      <header className="sticky top-0 z-50 shrink-0 border-b border-stone-200/85 bg-gradient-to-r from-[#faf8f4]/98 via-[#fbfaf7]/96 to-[#f7f3ec]/98 shadow-[0_1px_0_rgba(0,0,0,0.035)] backdrop-blur-md">
        <div className="mx-auto flex h-[3.75rem] max-w-7xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <BrandLogo
              size="compact"
              className="shrink-0 self-center focus-visible:ring-offset-[#ebe6dc]"
            />
            <span className="hidden h-8 w-px shrink-0 self-stretch bg-stone-300/90 sm:block" aria-hidden />
            {shellDoc ? (
              <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-stone-500">
                  {shellDoc.eyebrow}
                </p>
                <h1
                  id="docs-document-title"
                  className="truncate text-sm font-medium leading-tight text-stone-800"
                >
                  {shellDoc.headline}
                </h1>
              </div>
            ) : (
              <div className="hidden min-w-0 sm:flex sm:flex-col sm:justify-center sm:gap-0.5">
                <p className="text-[10px] font-semibold uppercase leading-none tracking-[0.2em] text-stone-500">
                  Legal center
                </p>
                <p className="truncate text-sm font-medium leading-tight text-stone-800">
                  Policies &amp; terms
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              prefetch
              href="/login"
              className={cn(
                "rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-medium text-stone-800 shadow-sm transition hover:border-stone-400 active:scale-[0.99] sm:inline-flex sm:px-3 sm:text-sm",
                DOCS_FOCUS,
              )}
            >
              Sign in
            </Link>
            <Link
              prefetch
              href="/signup"
              className={cn(
                "rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-md transition hover:from-cyan-500 hover:to-emerald-500 active:scale-[0.99] sm:px-4",
                DOCS_FOCUS,
              )}
            >
              Sign up
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className={cn(
                "inline-flex rounded-lg p-2.5 text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 lg:hidden",
                DOCS_FOCUS,
              )}
              aria-expanded={sidebarOpen}
              aria-controls="docs-sidebar"
              aria-label={sidebarOpen ? "Close documentation menu" : "Open documentation menu"}
            >
              {sidebarOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Body: left rail + main — min-h-0 so nested DocPage can own vertical scroll */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {isMobile && sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-[2px] lg:hidden"
            aria-label="Close menu"
            onClick={closeSidebar}
          />
        )}

        {/* Mobile drawer */}
        <aside
          id="docs-sidebar"
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[min(100%,18rem)] border-r border-stone-200/90 bg-[#fbfaf7] shadow-xl transition-transform duration-200 ease-out lg:hidden",
            isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <div className="flex h-full flex-col overflow-y-auto px-4 py-6">
            <div className="mb-4 flex items-center gap-2 px-1">
              <FiBook className="text-cyan-700" size={20} aria-hidden />
              <span className="text-sm font-semibold text-stone-800">Browse</span>
            </div>
            <nav className="flex flex-col gap-1" aria-label="Legal documents">
              {DOC_LINKS.map(({ href, label, description }) => (
                <DocNavLink
                  key={href}
                  href={href}
                  label={label}
                  description={description}
                  isActive={pathname === href}
                  onClick={closeSidebar}
                />
              ))}
            </nav>
            <div className="mt-8 border-t border-stone-200/80 pt-6">
              <p className="px-1 text-xs leading-relaxed text-stone-500">
                These documents apply to your use of AIGenius. For product help, return to the app from the logo.
              </p>
            </div>
          </div>
        </aside>

        {/* Desktop left rail — fixed to viewport, does not scroll with document */}
        <aside
          className="relative z-20 hidden w-56 shrink-0 overflow-hidden border-r border-stone-200/80 bg-gradient-to-b from-[#faf8f4] to-[#f0ebe3]/90 lg:fixed lg:left-0 lg:top-[3.75rem] lg:flex lg:h-[calc(100vh-3.75rem)] lg:flex-col"
          aria-label="Legal documents"
        >
          <div className="flex h-full flex-col overflow-hidden px-4 py-5">
            <nav className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden" aria-label="Legal documents">
              {DOC_LINKS.map(({ href, label, description }) => (
                <DocNavLink
                  key={href}
                  href={href}
                  label={label}
                  description={description}
                  isActive={pathname === href}
                />
              ))}
            </nav>
            <div className="mt-4 shrink-0 border-t border-stone-200/70 pt-4">
              <p className="text-[11px] leading-relaxed text-stone-500">
                These documents apply to your use of AIGenius. For product help, use the logo to return home.
              </p>
            </div>
          </div>
        </aside>

        <div
          id="docs-main"
          className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:pl-56"
          role="main"
        >
          {children}
        </div>
      </div>

      <footer className="shrink-0 border-t border-stone-200/90 bg-stone-200/35 py-6 text-center">
        <p className="text-xs text-stone-600">
          AIGenius · Nobox Labs Limited ·{" "}
          <Link
            prefetch
            href="/docs/privacy-policy"
            className={cn(DOCS_LINK_CLASS, DOCS_FOCUS)}
          >
            Privacy
          </Link>
          {" · "}
          <Link
            prefetch
            href="/docs/terms-and-conditions"
            className={cn(DOCS_LINK_CLASS, DOCS_FOCUS)}
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
