"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS, PRESS } from "./constants";
import { DownloadCta } from "./DownloadCta";
import { MenuIcon, XIcon } from "./icons";
import { useLandingScroll } from "./LandingShell";
import { Logo } from "./Logo";
import type { Platform } from "./platforms";
import { ThemeToggle } from "./ThemeToggle";
import { DISPLAY } from "./typography";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import { FiGlobe } from "react-icons/fi";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Scroll distance after which the header leaves the hero photo and becomes a glass bar. */
const OVER_IMAGE_UNTIL_PX = 40;
const MENU_ID = "mobile-menu";

/**
 * Header surfaces use plain stone and translucent colours instead of bg-lp-glass. In the browser that
 * background was not rendering, so the open mobile menu had no panel and its links sat on top of the
 * hero text. The open menu is a solid surface; the scrolled header is a blurred translucent bar.
 */
const HEADER_MENU_OPEN = "bg-stone-50 text-lp-fg dark:bg-stone-950";
const HEADER_GLASS = "bg-white/80 text-lp-fg backdrop-blur-md dark:bg-stone-950/75";

interface SiteHeaderProps {
  initialPlatform: Platform | null;
}

export function SiteHeader({ initialPlatform }: SiteHeaderProps) {
  const { t, openLanguageModal } = useLanguage();
  const container = useLandingScroll();
  const { scrollY } = useScroll({ container: container ?? undefined });
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (value) => setAtTop(value < OVER_IMAGE_UNTIL_PX));

  useEffect(() => {
    if (!menuOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [menuOpen]);

  // White-on-photo only while at the top with the menu closed; otherwise the readable glass bar.
  const onImage = atTop && !menuOpen;
  const linkTone = onImage ? "text-white/75 hover:text-white" : "text-lp-muted hover:text-lp-fg";

  const getNavLinkLabel = (label: string, href: string) => {
    if (href === "#models") return t("landing.models", label);
    if (href === "#desktop") return t("landing.desktop", label);
    if (href === "#tools") return t("landing.tools", label);
    if (href === "#pricing") return t("landing.pricing", label);
    return label;
  };

  const surface = menuOpen ? HEADER_MENU_OPEN : onImage ? "bg-transparent text-white" : HEADER_GLASS;

  return (
    // -mb-16 pulls the hero up underneath the transparent header.
    <header className={`sticky top-0 z-40 -mb-16 transition-colors duration-300 ${surface}`}>
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />

        <ul className="hidden items-center gap-8 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={`transition-colors duration-150 ${linkTone}`}>
                {getNavLinkLabel(link.label, link.href)}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm ${linkTone} ${PRESS}`}
          >
            {t("landing.signIn", "Sign in")}
          </Link>
          <button
            type="button"
            aria-label={t("landing.selectLanguage", "Select Language")}
            title={t("landing.selectLanguage", "Select Language")}
            onClick={() => openLanguageModal('landing')}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
              onImage
                ? "text-white/80 hover:bg-white/15 hover:text-white"
                : "text-lp-muted hover:bg-black/[0.06] hover:text-lp-fg dark:hover:bg-white/[0.1]"
            } ${PRESS}`}
          >
            <FiGlobe className="h-[18px] w-[18px]" />
          </button>
          <ThemeToggle onImage={onImage} />
          <div className="ml-1 hidden sm:block">
            <DownloadCta size="sm" initialPlatform={initialPlatform} onImage={onImage} />
          </div>
          <button
            type="button"
            aria-label={menuOpen ? t("common.close", "Close menu") : t("common.search", "Open menu")}
            aria-expanded={menuOpen}
            aria-controls={MENU_ID}
            onClick={() => setMenuOpen((open) => !open)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full md:hidden ${linkTone} ${PRESS}`}
          >
            {menuOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id={MENU_ID}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
            className="absolute inset-x-0 top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto overscroll-contain bg-stone-50 px-5 pb-8 pt-4 text-lp-fg dark:bg-stone-950 md:hidden"
          >
            {/* Plain links in a nav, not a <ul>: a global list rule was indenting them. */}
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`${DISPLAY} block py-3 text-4xl font-normal leading-tight tracking-[-0.03em] transition-opacity duration-150 hover:opacity-60`}
                >
                  {getNavLinkLabel(link.label, link.href)}
                </a>
              ))}
            </nav>

            <div className="mt-auto flex flex-col items-start gap-3 pt-10">
              <div className="[&>div]:items-start">
                <DownloadCta size="sm" initialPlatform={initialPlatform} onImage={false} />
              </div>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className={`inline-flex h-9 items-center justify-center rounded-full bg-black/[0.06] px-4 text-sm font-medium dark:bg-white/[0.1] ${PRESS}`}
              >
                Use it on the web
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}