import Link from "next/link";
import { cn } from "@/lib/utils";
import { PublicHeader, ThemeInitializer } from "@/app/components/PublicPageShellClient";
import { sans } from "@/app/components/landing/typography";
import "./home.css"; // Kept so any page still relying on its classes or tokens keeps working.

const FOOTER_LINK = "transition-colors duration-150 hover:text-lp-fg";

function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-10 text-sm text-lp-muted sm:flex-row sm:items-center sm:justify-between">
      <span>&#169; {year} Nobox Labs Limited</span>
      <nav className="flex gap-6" aria-label="Legal">
        <Link prefetch href="/docs/privacy-policy" className={FOOTER_LINK}>
          Privacy Policy
        </Link>
        <Link prefetch href="/docs/terms-and-conditions" className={FOOTER_LINK}>
          Terms of Service
        </Link>
      </nav>
    </footer>
  );
}

interface PublicPageShellProps {
  children: React.ReactNode;
  contentClassName?: string;
  showFooter?: boolean;
  hideHeader?: boolean;
  /** Accepted for compatibility with existing callers. It had no effect before and has none now. */
  hideAmbient?: boolean;
  rootClassName?: string;
}

/**
 * Frame for every public page, in the landing page's palette and type.
 * Same props and same structure as before. The page still scrolls with the window (it is not a
 * fixed scroll container), so anything that relies on window scroll keeps working.
 * `#main-content` is unchanged.
 */
export function PublicPageShell({
  children,
  contentClassName,
  showFooter = true,
  hideHeader = false,
  hideAmbient = false,
  rootClassName,
}: PublicPageShellProps) {
  void hideAmbient;
  return (
    <div
      className={cn(
        "landing relative flex min-h-screen flex-col bg-lp-bg text-lp-fg antialiased",
        sans.className,
        rootClassName,
      )}
    >
      <ThemeInitializer />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lp-fg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-lp-bg"
      >
        Skip to main content
      </a>
      {hideHeader ? null : <PublicHeader />}
      <main id="main-content" className={cn("relative z-10 flex w-full flex-1 flex-col", contentClassName)}>
        {children}
      </main>
      {showFooter ? <PublicFooter /> : null}
    </div>
  );
}

export default PublicPageShell;