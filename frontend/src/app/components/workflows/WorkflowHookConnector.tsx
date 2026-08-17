import { Plus } from "lucide-react";

/** Connector tail: hook shape — desktop points right, mobile points down */
export function HookConnector({
  orientation,
  onClick,
}: {
  orientation: "horizontal" | "vertical";
  onClick: () => void;
}) {
  const isV = orientation === "vertical";
  return (
    <button
      type="button"
      data-no-workflow-drag
      onClick={onClick}
      className={`group relative flex shrink-0 items-center justify-center rounded-lg border border-dashed border-[rgba(58,71,87,0.18)] bg-[rgba(255,255,255,0.55)] text-[rgba(58,71,87,0.35)] shadow-sm transition hover:border-teal-400/50 hover:bg-white/90 hover:text-teal-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-teal-500/60 dark:hover:bg-slate-800 dark:hover:text-teal-300 ${isV ? "mx-auto h-16 w-full max-w-[3.5rem]" : "h-10 w-14"
        }`}
      title="Add next step"
      aria-label="Add next step"
    >
      <svg
        viewBox="0 0 64 32"
        className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-10 -translate-x-1/2 -translate-y-1/2 text-current"
        style={{ transform: isV ? "translate(-50%, -50%) rotate(90deg)" : "translate(-50%, -50%)" }}
        fill="none"
        aria-hidden
      >
        <path
          d="M4 16h36c8 0 12-4 12-12M4 16h36c8 0 12 4 12 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M44 8l8-4v8l-8-4z" fill="currentColor" opacity="0.35" />
      </svg>
      <Plus className="relative z-10 h-4 w-4 opacity-60 transition group-hover:opacity-100" />
    </button>
  );
}
