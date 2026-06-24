/**
 * Visual tokens aligned with `user-files.theme` / My Files (TypeTagBar, tiles, explorer).
 * Maps `categorizeTool()` labels to distinct hues — no purple.
 */
export const WORKFLOW_TOOL_CATEGORY_THEME: Record<
  string,
  {
    dot: string;
    navActive: string;
    navIdle: string;
    chip: string;
    tileLeftBorder: string;
    tileIconBg: string;
    tileIconText: string;
    /** Hover ring — matches `CATEGORY_THEME.ringHover` in user-files.theme */
    ringHover: string;
  }
> = {
  Search: {
    dot: "bg-cyan-500",
    navActive:
      "bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border-cyan-400/60 text-cyan-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-cyan-500/10 hover:border-cyan-300/40",
    chip: "bg-cyan-600 text-white shadow-sm",
    tileLeftBorder: "border-l-cyan-500",
    tileIconBg: "bg-cyan-50",
    tileIconText: "text-cyan-600",
    ringHover: "hover:ring-cyan-400/70",
  },
  "Web pages": {
    dot: "bg-emerald-500",
    navActive:
      "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-400/60 text-emerald-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-emerald-500/10 hover:border-emerald-300/40",
    chip: "bg-emerald-600 text-white shadow-sm",
    tileLeftBorder: "border-l-emerald-500",
    tileIconBg: "bg-emerald-50",
    tileIconText: "text-emerald-600",
    ringHover: "hover:ring-emerald-400/70",
  },
  Gmail: {
    dot: "bg-rose-500",
    navActive:
      "bg-gradient-to-r from-rose-500/20 to-red-500/10 border-rose-400/55 text-rose-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-rose-500/10 hover:border-rose-300/40",
    chip: "bg-rose-600 text-white shadow-sm",
    tileLeftBorder: "border-l-rose-500",
    tileIconBg: "bg-rose-50",
    tileIconText: "text-rose-600",
    ringHover: "hover:ring-rose-400/70",
  },
  Notes: {
    dot: "bg-amber-500",
    navActive:
      "bg-gradient-to-r from-amber-500/25 to-orange-500/15 border-amber-400/60 text-amber-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-amber-500/10 hover:border-amber-300/40",
    chip: "bg-amber-600 text-white shadow-sm",
    tileLeftBorder: "border-l-amber-500",
    tileIconBg: "bg-amber-50",
    tileIconText: "text-amber-600",
    ringHover: "hover:ring-amber-400/70",
  },
  "AI thinking": {
    dot: "bg-slate-600",
    navActive:
      "bg-gradient-to-r from-slate-600/20 to-zinc-500/10 border-slate-400/50 text-slate-900",
    navIdle:
      "border-transparent text-gray-700 hover:bg-slate-500/10 hover:border-slate-300/40",
    chip: "bg-slate-700 text-white shadow-sm",
    tileLeftBorder: "border-l-slate-600",
    tileIconBg: "bg-slate-100",
    tileIconText: "text-slate-600",
    ringHover: "hover:ring-slate-400/70",
  },
  Wallet: {
    dot: "bg-orange-600",
    navActive:
      "bg-gradient-to-r from-orange-500/25 to-amber-600/15 border-orange-400/55 text-orange-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-orange-500/10 hover:border-orange-300/40",
    chip: "bg-orange-600 text-white shadow-sm",
    tileLeftBorder: "border-l-orange-600",
    tileIconBg: "bg-orange-50",
    tileIconText: "text-orange-600",
    ringHover: "hover:ring-orange-400/70",
  },
  Documents: {
    dot: "bg-cyan-500",
    navActive:
      "bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border-cyan-400/60 text-cyan-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-cyan-500/10 hover:border-cyan-300/40",
    chip: "bg-cyan-600 text-white shadow-sm",
    tileLeftBorder: "border-l-cyan-500",
    tileIconBg: "bg-cyan-50",
    tileIconText: "text-cyan-600",
    ringHover: "hover:ring-cyan-400/70",
  },
  "Other tools": {
    dot: "bg-gray-500",
    navActive:
      "bg-gradient-to-r from-gray-400/25 to-gray-500/15 border-gray-400/50 text-gray-900",
    navIdle:
      "border-transparent text-gray-700 hover:bg-gray-200/80 hover:border-gray-300/60",
    chip: "bg-gray-700 text-white shadow-sm",
    tileLeftBorder: "border-l-gray-500",
    tileIconBg: "bg-gray-100",
    tileIconText: "text-gray-600",
    ringHover: "hover:ring-gray-400/70",
  },
};

export function themeForWorkflowCategory(category: string) {
  return WORKFLOW_TOOL_CATEGORY_THEME[category] ?? WORKFLOW_TOOL_CATEGORY_THEME["Other tools"];
}

/** Shared section shell: matches `UserFilesBrowser` page variant. */
export const workflowExplorerSectionClass =
  "overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm";

export const workflowExplorerHeaderClass = "border-b border-gray-100 px-4 py-3 sm:px-5";

export const workflowExplorerBodyClass = "flex min-h-0 flex-col p-4 sm:p-5";
