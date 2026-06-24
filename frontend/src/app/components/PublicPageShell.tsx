import Link from "next/link";
import { BrandLogo } from "@/app/components/BrandLogo";
import { cn } from "@/lib/utils";
import { PublicHeader } from "@/app/components/PublicPageShellClient";
import { FOCUS_RING, PAGE_BG } from "@/app/components/public-page-shell.constants";

export { PAGE_BG };

function PublicAmbientBackground() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(8,145,178,0.22),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-cyan-500/[0.15] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-amber-500/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-96 rounded-full bg-emerald-600/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-[2] opacity-[0.045] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,black,transparent)]"
        aria-hidden
      />
    </>
  );
}

function PublicFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-zinc-950/80">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-300">AIGenius</span>
          <span>by Nobox Labs Limited</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-400">
          <Link
            prefetch
            href="/docs/privacy-policy"
            className={cn("hover:text-zinc-200", FOCUS_RING)}
          >
            Privacy Policy
          </Link>
          <Link
            prefetch
            href="/docs/terms-and-conditions"
            className={cn("hover:text-zinc-200", FOCUS_RING)}
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

interface PublicPageShellProps {
  children: React.ReactNode;
  /** Extra classes on the primary content wrapper (below header, above footer). */
  contentClassName?: string;
  /** Hide footer on minimal pages (e.g. OAuth popup). */
  showFooter?: boolean;
}

/**
 * Shared chrome for logged-out marketing, auth, docs, and public listings.
 */
export function PublicPageShell({
  children,
  contentClassName,
  showFooter = true,
}: PublicPageShellProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-hidden text-zinc-100"
      style={{ backgroundColor: PAGE_BG }}
    >
      <PublicAmbientBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0b0e14]"
      >
        Skip to main content
      </a>
      <PublicHeader />
      <div
        id="main-content"
        role="main"
        className={cn("relative z-10 flex min-h-0 flex-1 flex-col", contentClassName)}
      >
        {children}
      </div>
      {showFooter ? <PublicFooter /> : null}
    </div>
  );
}
