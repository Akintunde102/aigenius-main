/**
 * The real app's palette (light and dark), self-contained so the marketing previews do not depend
 * on any other theme file. Panels have a background AND a hairline border, like the app's bubbles and menus.
 */
export const PREVIEW = {
  frame: "bg-[#fdfdfc] text-[#1f1f1e] dark:bg-[#111114] dark:text-[#e6e6e8]",
  topBar: "bg-[#f6f5f3] dark:bg-[#17171b]",
  line: "border-black/10 dark:border-white/10",
  hover: "hover:bg-black/5 dark:hover:bg-white/[0.07]",
  active: "bg-black/[0.05] dark:bg-white/[0.07]",
  bubble: "bg-black/[0.05] dark:bg-white/[0.06]",
  muted: "text-black/45 dark:text-white/45",
  panel: "bg-[#fafaf9] dark:bg-[#18181c]",
  popover: "bg-[#fdfdfc] dark:bg-[#202127]",
  send: "bg-black/[0.07] text-black/45 dark:bg-white/[0.08] dark:text-white/40",
  sendActive: "bg-[#1f1f1e] text-white dark:bg-sky-600 dark:text-white",
  pill: "bg-[#fdfdfc] dark:bg-[#2b2c33]",
  accent: "text-sky-700 dark:text-sky-400",
  accentSoft: "text-sky-700/70 dark:text-sky-300/60",
} as const;

/** A rounded panel in the app's colours, for demos that are not a full app window. */
export const PREVIEW_PANEL = `rounded-3xl border p-6 sm:p-10 ${PREVIEW.frame} ${PREVIEW.line}`;
