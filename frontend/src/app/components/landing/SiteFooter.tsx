"use client";

import Link from "next/link";
import { NAV_LINKS } from "./constants";
import { Logo } from "./Logo";

const COLUMN_TITLE = "text-[14px] font-medium text-stone-900 dark:text-stone-100";
const COLUMN_LINKS = "mt-4 flex flex-col gap-2.5";
const FOOTER_LINK =
  "w-fit text-[14px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors duration-150";

/**
 * A compact, cleanly aligned footer inspired by Cursor/Linear.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-black/[0.08] bg-lp-bg dark:border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
              One workspace for every frontier model. Pay for what you use.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4"
          >
            <div>
              <h3 className={COLUMN_TITLE}>Product</h3>
              <div className={COLUMN_LINKS}>
                {NAV_LINKS.map((link) => (
                  <a key={link.href} href={link.href} className={FOOTER_LINK}>
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>Account</h3>
              <div className={COLUMN_LINKS}>
                <Link href="/login" className={FOOTER_LINK}>
                  Sign in
                </Link>
                <Link href="/login" className={FOOTER_LINK}>
                  Sign up
                </Link>
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>Legal</h3>
              <div className={COLUMN_LINKS}>
                <Link href="/docs/privacy-policy" className={FOOTER_LINK}>
                  Privacy Policy
                </Link>
                <Link href="/docs/terms-and-conditions" className={FOOTER_LINK}>
                  Terms of Service
                </Link>
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>Connect</h3>
              <div className={COLUMN_LINKS}>
                <a href="#" className={FOOTER_LINK}>
                  X (Twitter)
                </a>
                <a href="#" className={FOOTER_LINK}>
                  GitHub
                </a>
              </div>
            </div>
          </nav>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-black/[0.08] pt-8 dark:border-white/[0.08] sm:flex-row">
          <p className="text-[13px] text-stone-500 dark:text-stone-400">
            &copy; {new Date().getFullYear()} Nobox Labs Limited
          </p>
          <div className="flex gap-4 text-[13px] text-stone-500 dark:text-stone-400">
            <span>SOC 2</span>
            <span>Privacy choices</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
