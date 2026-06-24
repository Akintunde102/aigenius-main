/** Base tone for fallbacks and focus ring offset (matches layered shell bg) */
export const DOCS_PAGE_BG = "#ebe6dc";

/**
 * Warm layered shell — avoids a flat wash; radials read as soft paper / gallery light.
 * Keep in sync with `DOCS_PAGE_BG` for ring-offset.
 */
export const DOCS_PAGE_BG_CLASS =
  "bg-[#ebe6dc] bg-[radial-gradient(ellipse_110%_60%_at_50%_-15%,#fdf9f3_0%,transparent_55%),radial-gradient(ellipse_50%_45%_at_100%_30%,rgba(212,185,150,0.2),transparent_52%),radial-gradient(ellipse_42%_38%_at_0%_75%,rgba(190,175,155,0.16),transparent_50%),linear-gradient(180deg,#f3efe8_0%,#ebe6dc_38%,#e8e2d8_100%)]";

/** Current document title in the sticky shell (privacy / terms only) */
export const DOCS_SHELL_DOCUMENT_BY_PATH: Record<
  string,
  { eyebrow: string; headline: string }
> = {
  "/docs/privacy-policy": { eyebrow: "Legal document", headline: "Privacy Policy" },
  "/docs/terms-and-conditions": { eyebrow: "Legal document", headline: "Terms of Service" },
};

/** Focus ring for light docs chrome */
export const DOCS_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#ebe6dc]";

/** Primary marketing cards + policy article shell */
export const DOCS_SURFACE_CARD =
  "rounded-2xl border border-stone-200/90 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]";

/** Anchor scroll margin below sticky header */
export const DOCS_SCROLL_MARGIN = "scroll-mt-[4.75rem]";

/** Body copy — editorial rhythm */
export const DOCS_PROSE_BODY =
  "text-[17px] leading-[1.78] text-stone-700 antialiased [font-feature-settings:'kern'_1,'liga'_1]";

/** Inline / footer text links (pair with DOCS_FOCUS on interactive elements) */
export const DOCS_LINK_CLASS =
  "font-medium text-cyan-800 underline underline-offset-2 decoration-cyan-300/60 hover:text-cyan-950 hover:decoration-cyan-500/80";
