/**
 * Docs chrome in the landing page's palette. Every export keeps its name, so layouts and
 * components that import these constants pick up the new look without code changes.
 * Colours come from the landing tokens or from translucent black and white, so they follow
 * light and dark mode instead of being fixed cream.
 */

/**
 * Kept for anything that still reads the hex value. The shell background itself is now
 * DOCS_PAGE_BG_CLASS, which follows the theme.
 */
export const DOCS_PAGE_BG = "#ebe6dc";

/** The old layered cream wash is gone: a plain themed page, like the landing page. */
export const DOCS_PAGE_BG_CLASS = "bg-lp-bg text-lp-fg";

/** Current document title in the sticky shell (privacy / terms only) */
export const DOCS_SHELL_DOCUMENT_BY_PATH: Record<
  string,
  { eyebrow: string; headline: string }
> = {
  "/docs/privacy-policy": { eyebrow: "Legal document", headline: "Privacy Policy" },
  "/docs/terms-and-conditions": { eyebrow: "Legal document", headline: "Terms of Service" },
};

/** Focus ring that works on a light or a dark page (no ring offset colour to keep in sync). */
export const DOCS_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/50";

/** Cards and the policy article shell: a tonal step off the page, no border. */
export const DOCS_SURFACE_CARD = "rounded-2xl bg-black/[0.04] dark:bg-white/[0.05]";

/** Anchor scroll margin below the 4rem sticky site header. */
export const DOCS_SCROLL_MARGIN = "scroll-mt-24";

/** Body copy: comfortable reading size and rhythm. */
export const DOCS_PROSE_BODY = "text-[16px] leading-[1.75] text-lp-fg antialiased";

/** Inline and footer text links (pair with DOCS_FOCUS on interactive elements). */
export const DOCS_LINK_CLASS =
  "font-medium underline underline-offset-4 decoration-black/30 transition-colors duration-150 hover:decoration-black/70 dark:decoration-white/30 dark:hover:decoration-white/70";