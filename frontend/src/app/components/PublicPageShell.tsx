import Link from "next/link";
import { cn } from "@/lib/utils";
import { PublicHeader, ThemeInitializer } from "@/app/components/PublicPageShellClient";
import "./home.css"; // Ensure home.css is imported

function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <span>&#169; {year} Nobox Labs Limited</span>
      <nav className="footer-links" aria-label="Legal">
        <Link prefetch href="/docs/privacy-policy">Privacy Policy</Link>
        <Link prefetch href="/docs/terms-and-conditions">Terms of Service</Link>
      </nav>
    </footer>
  );
}

interface PublicPageShellProps {
  children: React.ReactNode;
  contentClassName?: string;
  showFooter?: boolean;
  hideHeader?: boolean;
  hideAmbient?: boolean;
  rootClassName?: string;
}

export function PublicPageShell({
  children,
  contentClassName,
  showFooter = true,
  hideHeader = false,
  hideAmbient = false,
  rootClassName,
}: PublicPageShellProps) {
  return (
    <div className={cn("home-root scrollable", rootClassName)}>
      <ThemeInitializer />
      <div className="page">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-black focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-[#0b0e14]"
        >
          Skip to main content
        </a>
        {hideHeader ? null : <PublicHeader />}
        <main
          id="main-content"
          className={cn("flex w-full flex-1 flex-col relative z-10", contentClassName)}
        >
          {children}
        </main>
        {showFooter ? <PublicFooter /> : null}
      </div>
    </div>
  );
}