import Link from "next/link";
import { NAV_LINKS } from "./constants";
import { Logo } from "./Logo";
import { Reveal } from "./Reveal";
import { DISPLAY } from "./typography";

const COLUMN_TITLE = "text-sm text-stone-500 dark:text-stone-400";
const COLUMN_LINKS = "mt-5 flex flex-col gap-3.5";
const FOOTER_LINK =
  "w-fit text-[15px] transition-opacity duration-150 hover:opacity-60";

/**
 * Two parts, in the way the big product sites close a page: one last call to action on the page
 * background, then a quiet link band on a tonal step. Only links that go somewhere real.
 *
 * Two deliberate choices:
 * - Links are plain anchors in a flex column, not <ul>/<li>, because a global list rule in the
 *   project CSS was indenting every list by about 20px.
 * - The button and the band use plain Tailwind stone and translucent colours instead of the
 *   bg-lp-* tokens. In the browser those tokens were not producing a background here.
 */
export function SiteFooter() {
  return (
    <footer>
      <section className="px-5 py-28 text-center lg:py-40">
        <Reveal>
          <h2
            className={`${DISPLAY} text-5xl leading-[1.02] tracking-[-0.03em] lg:text-7xl`}
          >
            Try AIGenius now.
          </h2>
          <Link
            href="/login"
            className="mt-10 inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-stone-900 px-7 text-[15px] font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-85 active:scale-[0.97] dark:bg-white dark:text-stone-900"
          >
            Use it on the web
          </Link>
        </Reveal>
      </section>

      <div className="bg-black/[0.03] dark:bg-white/[0.04]">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-16">
          <div className="grid gap-14 md:grid-cols-12">
            <div className="md:col-span-5">
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                One workspace for every frontier model. Pay for what you use.
              </p>
            </div>

            <nav
              aria-label="Footer"
              className="grid grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-3 md:col-span-7"
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
                </div>
              </div>

              <div>
                <h3 className={COLUMN_TITLE}>Legal</h3>
                <div className={COLUMN_LINKS}>
                  <Link href="/docs/privacy-policy" className={FOOTER_LINK}>
                    Privacy Policy
                  </Link>
                  <Link
                    href="/docs/terms-and-conditions"
                    className={FOOTER_LINK}
                  >
                    Terms of Service
                  </Link>
                </div>
              </div>
            </nav>
          </div>

          <p className="mt-20 text-sm text-stone-500 dark:text-stone-400">
            &copy; {new Date().getFullYear()} Nobox Labs Limited
          </p>
        </div>
      </div>
    </footer>
  );
}
