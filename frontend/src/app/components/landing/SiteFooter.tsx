"use client";

import Link from "next/link";
import { NAV_LINKS } from "./constants";
import { Logo } from "./Logo";
import { useLanguage } from "@/lib/providers/LanguageProvider";

const FOOTER_LINK = "transition-colors duration-150 hover:text-lp-fg";

export function SiteFooter() {
  const { t } = useLanguage();

  const getNavLinkLabel = (label: string, href: string) => {
    if (href === "#models") return t("landing.models", label);
    if (href === "#desktop") return t("landing.desktop", label);
    if (href === "#tools") return t("landing.tools", label);
    if (href === "#pricing") return t("landing.pricing", label);
    return label;
  };
  return (
    <footer className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-12 pt-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-lp-muted">
            {t("landing.heroSubtitle", "One workspace for every frontier model. Pay for what you use.")}
          </p>
        </div>

        <nav aria-label="Footer" className="grid grid-cols-2 gap-8 text-sm text-lp-muted sm:grid-cols-3 md:col-span-7">
          <div>
            <p className="font-medium text-lp-fg">{t("landing.product", "Product")}</p>
            <ul className="mt-4 space-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={FOOTER_LINK}>
                    {getNavLinkLabel(link.label, link.href)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium text-lp-fg">{t("landing.account", "Account")}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/login" className={FOOTER_LINK}>
                  {t("landing.signIn", "Sign in")}
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-lp-fg">{t("landing.legal", "Legal")}</p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/docs/privacy-policy" className={FOOTER_LINK}>
                  {t("landing.privacyPolicy", "Privacy Policy")}
                </Link>
              </li>
              <li>
                <Link href="/docs/terms-and-conditions" className={FOOTER_LINK}>
                  {t("landing.termsOfService", "Terms of Service")}
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </div>

      <p className="mx-auto max-w-6xl px-5 text-sm text-lp-muted">
        &copy; {new Date().getFullYear()} {t("landing.allRightsReserved", "Nobox Labs Limited")}
      </p>

      {/* Oversized faint wordmark: decorative, closes the page without another section. */}
      <p
        aria-hidden="true"
        className="select-none px-5 pt-10 text-center text-[clamp(4rem,19vw,15rem)] font-medium leading-[0.8] tracking-[-0.06em] text-lp-tint"
      >
        AIGenius
      </p>
    </footer>
  );
}
