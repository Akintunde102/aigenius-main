/**
 * Palette of the real desktop app (from the product screenshots), so the replica reads as the
 * actual product rather than as the landing page's own style. Light and dark are both covered.
 */
export const APP = {
  frame: "bg-[#fdfdfc] text-[#1f1f1e] dark:bg-[#111114] dark:text-[#e6e6e8]",
  sidebar: "bg-[#f6f5f3] dark:bg-[#17171b]",
  topBar: "bg-[#f6f5f3] dark:bg-[#17171b]",
  line: "border-black/10 dark:border-white/10",
  tableLine: "border-black/25 dark:border-white/25",
  hover: "hover:bg-black/5 dark:hover:bg-white/[0.07]",
  active: "bg-black/[0.05] dark:bg-white/[0.07]",
  bubble: "bg-black/[0.05] dark:bg-white/[0.06]",
  muted: "text-black/45 dark:text-white/45",
  groupLabel: "text-black/70 dark:text-white/70",
  panel: "bg-[#fafaf9] dark:bg-[#18181c]",
  popover: "bg-[#fdfdfc] dark:bg-[#202127]",
  send: "bg-black/[0.07] text-black/45 dark:bg-white/[0.08] dark:text-white/40",
  sendActive: "bg-[#1f1f1e] text-white dark:bg-sky-600 dark:text-white",
  brand: "text-amber-500 dark:text-amber-400",
  toast: "bg-[#1f1f1e] text-white dark:bg-white dark:text-[#1f1f1e]",
} as const;
