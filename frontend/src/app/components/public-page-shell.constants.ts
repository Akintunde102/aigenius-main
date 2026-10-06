/** Matches `PublicPageShell` root background (opaque; safe for client components). Kept for existing imports. */
export const PAGE_BG = "#0b0e14";

/**
 * Focus ring for the public pages. It no longer uses a cyan ring with a fixed dark offset colour,
 * so it reads on both the light and the dark page. Same export name, so every importer picks it up.
 */
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40 dark:focus-visible:ring-white/50";