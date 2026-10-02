"use client";

import {
  applyResolvedColorMode,
  COLOR_MODE_STORAGE_KEY,
  LEGACY_THEME_STORAGE_KEY,
} from "@/lib/color-mode";
import { PRESS } from "./constants";
import { MoonIcon, SunIcon } from "./icons";

interface ThemeToggleProps {
  /** True while the header sits on the hero photo. */
  onImage?: boolean;
}

export function ThemeToggle({ onImage = false }: ThemeToggleProps) {
  const toggle = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, next);
      localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort (storage can throw in private mode); the theme still applies below.
    }
    applyResolvedColorMode(next);
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggle}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${
        onImage
          ? "text-white/80 hover:bg-white/15 hover:text-white"
          : "text-lp-muted hover:bg-lp-tint hover:text-lp-fg"
      } ${PRESS}`}
    >
      {/* CSS swaps the icon so there is no state and no hydration mismatch. */}
      <SunIcon className="hidden h-[18px] w-[18px] dark:block" />
      <MoonIcon className="h-[18px] w-[18px] dark:hidden" />
    </button>
  );
}
