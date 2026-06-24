import type { UserFileCategory } from "./user-files.utils";

/** Distinct hues per type (no purple / violet). */
export const CATEGORY_THEME: Record<
  UserFileCategory,
  {
    dot: string;
    navActive: string;
    navIdle: string;
    chip: string;
    tileAccent: string;
    ringHover: string;
  }
> = {
  images: {
    dot: "bg-emerald-500",
    navActive:
      "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-400/60 text-emerald-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-emerald-500/10 hover:border-emerald-300/40",
    chip: "bg-emerald-500/90 text-white shadow-sm",
    tileAccent: "from-emerald-500/25 to-teal-600/20",
    ringHover: "hover:ring-emerald-400/70",
  },
  documents: {
    dot: "bg-sky-500",
    navActive:
      "bg-gradient-to-r from-sky-500/20 to-cyan-500/10 border-sky-400/60 text-sky-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-sky-500/10 hover:border-sky-300/40",
    chip: "bg-sky-600 text-white shadow-sm",
    tileAccent: "from-sky-500/25 to-cyan-600/20",
    ringHover: "hover:ring-sky-400/70",
  },
  spreadsheets: {
    dot: "bg-amber-500",
    navActive:
      "bg-gradient-to-r from-amber-500/25 to-orange-500/15 border-amber-400/60 text-amber-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-amber-500/10 hover:border-amber-300/40",
    chip: "bg-amber-600 text-white shadow-sm",
    tileAccent: "from-amber-400/30 to-orange-500/25",
    ringHover: "hover:ring-amber-400/70",
  },
  presentations: {
    dot: "bg-rose-500",
    navActive:
      "bg-gradient-to-r from-rose-500/20 to-red-500/10 border-rose-400/55 text-rose-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-rose-500/10 hover:border-rose-300/40",
    chip: "bg-rose-600 text-white shadow-sm",
    tileAccent: "from-rose-500/25 to-red-500/20",
    ringHover: "hover:ring-rose-400/70",
  },
  code: {
    dot: "bg-slate-600",
    navActive:
      "bg-gradient-to-r from-slate-600/20 to-zinc-500/10 border-slate-400/50 text-slate-900",
    navIdle:
      "border-transparent text-gray-700 hover:bg-slate-500/10 hover:border-slate-300/40",
    chip: "bg-slate-700 text-white shadow-sm",
    tileAccent: "from-slate-500/25 to-zinc-600/20",
    ringHover: "hover:ring-slate-400/70",
  },
  archives: {
    dot: "bg-orange-600",
    navActive:
      "bg-gradient-to-r from-orange-500/25 to-amber-600/15 border-orange-400/55 text-orange-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-orange-500/10 hover:border-orange-300/40",
    chip: "bg-orange-600 text-white shadow-sm",
    tileAccent: "from-orange-500/30 to-amber-600/25",
    ringHover: "hover:ring-orange-400/70",
  },
  audio_video: {
    dot: "bg-lime-600",
    navActive:
      "bg-gradient-to-r from-lime-400/35 to-green-500/15 border-lime-500/50 text-lime-950",
    navIdle:
      "border-transparent text-gray-700 hover:bg-lime-400/15 hover:border-lime-400/45",
    chip: "bg-lime-700 text-white shadow-sm",
    tileAccent: "from-lime-400/35 to-green-600/25",
    ringHover: "hover:ring-lime-500/70",
  },
  other: {
    dot: "bg-gray-500",
    navActive:
      "bg-gradient-to-r from-gray-400/25 to-gray-500/15 border-gray-400/50 text-gray-900",
    navIdle:
      "border-transparent text-gray-700 hover:bg-gray-200/80 hover:border-gray-300/60",
    chip: "bg-gray-700 text-white shadow-sm",
    tileAccent: "from-gray-400/30 to-gray-600/25",
    ringHover: "hover:ring-gray-400/70",
  },
};
