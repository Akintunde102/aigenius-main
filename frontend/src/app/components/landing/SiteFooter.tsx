"use client";

import Link from "next/link";
import { FOOTER_NAV_LINKS } from "./constants";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/providers/LanguageProvider";

const COLUMN_TITLE = "text-[14px] font-medium text-stone-900 dark:text-stone-100";
const COLUMN_LINKS = "mt-4 flex flex-col gap-2.5";
const FOOTER_LINK =
  "w-fit text-[14px] text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100 transition-colors duration-150";

/**
 * A compact, cleanly aligned footer inspired by Cursor/Linear.
 */
export function SiteFooter() {
  const { t } = useLanguage();

  const getNavLinkLabel = (label: string, href: string) => {
    if (href === "#models") return t("landing.models", label);
    if (href === "#desktop") return t("landing.desktop", label);
    if (href === "#tools") return t("landing.tools", label);
    if (href === "#pricing") return t("landing.pricing", label);
    if (href === "/published-conversations")
      return t("landing.publishedConversations", label);
    if (href === "/h") return t("landing.publishedPages", label);
    return label;
  };

  return (
    <footer className="border-t border-black/[0.08] bg-lp-bg dark:border-white/[0.08]">
      <div className="mx-auto max-w-6xl px-5 pb-8 pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-stone-500 dark:text-stone-400">
              {t(
                "landing.footerTagline",
                "One workspace for every frontier model. Pay for what you use.",
              )}
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-4"
          >
            <div>
              <h3 className={COLUMN_TITLE}>{t("landing.product", "Product")}</h3>
              <div className={COLUMN_LINKS}>
                {FOOTER_NAV_LINKS.map((link) => {
                  const isInternal = link.href.startsWith("/");
                  const label = getNavLinkLabel(link.label, link.href);
                  return isInternal ? (
                    <Link key={link.href} href={link.href} className={FOOTER_LINK}>
                      {label}
                    </Link>
                  ) : (
                    <a key={link.href} href={link.href} className={FOOTER_LINK}>
                      {label}
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>{t("landing.account", "Account")}</h3>
              <div className={COLUMN_LINKS}>
                <Link href="/login" className={FOOTER_LINK}>
                  {t("landing.signIn", "Sign in")}
                </Link>
                <Link href="/login" className={FOOTER_LINK}>
                  {t("auth.signUp", "Sign up")}
                </Link>
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>{t("landing.legal", "Legal")}</h3>
              <div className={COLUMN_LINKS}>
                <Link href="/docs/privacy-policy" className={FOOTER_LINK}>
                  {t("landing.privacyPolicy", "Privacy Policy")}
                </Link>
                <Link href="/docs/terms-and-conditions" className={FOOTER_LINK}>
                  {t("landing.termsOfService", "Terms of Service")}
                </Link>
              </div>
            </div>

            <div>
              <h3 className={COLUMN_TITLE}>{t("landing.connect", "Connect")}</h3>
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
            &copy; {new Date().getFullYear()} {t("landing.allRightsReserved", "Nobox Labs Limited")}
          </p>
          <div className="flex gap-4 text-[13px] text-stone-500 dark:text-stone-400">
            <span>SOC 2</span>
            <span>{t("landing.privacyChoices", "Privacy choices")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
