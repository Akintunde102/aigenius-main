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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      prefetch
      href={href}
      className={cn("text-sm text-zinc-500 transition hover:text-white", FOCUS_RING)}
    >
      {children}
    </Link>
  );
}

function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative z-10 mt-auto w-full border-t border-white/[0.08] bg-[#05070d]/90 backdrop-blur-sm">
      {/* Gradient hairline */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-[1.6fr_1fr_1fr]">
          {/* Brand */}
          <div className="space-y-3">
            <BrandLogo size="default" />
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
              Every top AI model, in one workspace. Chat, automate, and pay only
              for what you use.
            </p>
            <p className="text-xs text-zinc-600">by Nobox Labs Limited</p>
          </div>

          {/* Product */}
          <nav aria-label="Product">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Product
            </p>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              <li>
                <FooterLink href="/published-conversations">Conversations</FooterLink>
              </li>
              <li>
                <FooterLink href="/signup">Sign up</FooterLink>
              </li>
              <li>
                <FooterLink href="/login">Sign in</FooterLink>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-sm text-zinc-600">Desktop app</span>
                <span className="rounded-full border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                  Soon
                </span>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          <nav aria-label="Legal">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Legal
            </p>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              <li>
                <FooterLink href="/docs/privacy-policy">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink href="/docs/terms-and-conditions">Terms of Service</FooterLink>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-white/[0.06] pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center">
          <span>© {year} Nobox Labs Limited. All rights reserved.</span>
          <span>Pay-as-you-go AI chat & automations</span>
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
  /** Hide the sticky public header (e.g. full-bleed landing hero). */
  hideHeader?: boolean;
  /** Omit marketing ambient gradients — flat app background only. */
  hideAmbient?: boolean;
  /** Optional root wrapper classes (e.g. homepage light/dark surfaces). */
  rootClassName?: string;
}

/**
 * Shared chrome for logged-out marketing, auth, docs, and public listings.
 * Footer is always pinned to the bottom of the viewport (flex column + mt-auto),
 * so it never "hangs" in the middle of the page.
 */
export function PublicPageShell({
  children,
  contentClassName,
  showFooter = true,
  hideHeader = false,
  hideAmbient = false,
  rootClassName,
}: PublicPageShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen min-h-[100dvh] w-full shrink-0 flex-col overflow-x-hidden text-zinc-100",
        rootClassName,
      )}
      style={rootClassName ? undefined : { backgroundColor: PAGE_BG }}
    >
      {hideAmbient ? null : <PublicAmbientBackground />}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0b0e14]"
      >
        Skip to main content
      </a>
      {hideHeader ? null : <PublicHeader />}
      <div
        id="main-content"
        role="main"
        className={cn("relative z-10 flex w-full flex-1 flex-col", contentClassName)}
      >
        {children}
      </div>
      {showFooter ? <PublicFooter /> : null}
    </div>
  );
}
