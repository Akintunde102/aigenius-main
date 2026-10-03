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

const EASE = [0.23, 1, 0.32, 1] as const;

/** Scroll distance after which the header leaves the hero photo and becomes a glass bar. */
const OVER_IMAGE_UNTIL_PX = 40;
const MENU_ID = "mobile-menu";

interface SiteHeaderProps {
  initialPlatform: Platform | null;
}

export function SiteHeader({ initialPlatform }: SiteHeaderProps) {
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

  return (
    // -mb-16 pulls the hero up underneath the transparent header.
    <header
      className={`sticky top-0 z-40 -mb-16 transition-colors duration-300 ${
        onImage ? "bg-transparent text-white" : "bg-lp-glass text-lp-fg backdrop-blur-md"
      }`}
    >
      <nav aria-label="Primary" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />

        <ul className="hidden items-center gap-8 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className={`transition-colors duration-150 ${linkTone}`}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className={`inline-flex h-9 items-center rounded-full px-3.5 text-sm ${linkTone} ${PRESS}`}
          >
            Sign in
          </Link>
          <ThemeToggle onImage={onImage} />
          <div className="ml-1 hidden sm:block">
            <DownloadCta size="sm" initialPlatform={initialPlatform} onImage={onImage} />
          </div>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
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
            className="absolute inset-x-0 top-16 bg-lp-glass px-5 pb-6 pt-2 text-lp-fg backdrop-blur-md md:hidden"
          >
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-3 py-3 text-lg transition-colors duration-150 hover:bg-lp-tint"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
