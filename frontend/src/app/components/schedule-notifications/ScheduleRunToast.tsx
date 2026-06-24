"use client";

import React from "react";
import { X } from "lucide-react";
import toast, { type Toast as HotToast } from "react-hot-toast";

export type ScheduleRunToastVariant = "started" | "ended_ok" | "ended_error" | "ended_cancelled";

function copyFor(variant: ScheduleRunToastVariant): { title: string; detail: string; barClass: string } {
  switch (variant) {
    case "started":
      return {
        title: "Started",
        detail: "Your scheduled workflow is running.",
        barClass: "bg-teal-500",
      };
    case "ended_ok":
      return {
        title: "Finished",
        detail: "Completed successfully.",
        barClass: "bg-emerald-500",
      };
    case "ended_error":
      return {
        title: "Finished",
        detail: "It didn't finish successfully. Open the run for details.",
        barClass: "bg-rose-500",
      };
    case "ended_cancelled":
      return {
        title: "Finished",
        detail: "This run was cancelled.",
        barClass: "bg-slate-400",
      };
    default:
      return { title: "", detail: "", barClass: "bg-slate-400" };
  }
}

/** Custom react-hot-toast body: compact, side-aligned, easy to dismiss. */
export function ScheduleRunToast({
  t,
  variant,
  workflowName,
}: {
  t: HotToast;
  variant: ScheduleRunToastVariant;
  workflowName: string;
}): React.ReactElement {
  const { title, detail, barClass } = copyFor(variant);

  return (
    <div
      className="schedule-run-toast-inner flex max-w-[min(100vw-1.5rem,19rem)] overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.05] backdrop-blur-md"
      role="status"
    >
      <div className={`w-[3px] shrink-0 ${barClass}`} aria-hidden />
      <div className="min-w-0 flex-1 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{title}</p>
        <p className="mt-0.5 truncate text-[13px] font-semibold leading-tight text-slate-900">{workflowName}</p>
        <p className="mt-1 text-[11px] leading-snug text-slate-600">{detail}</p>
      </div>
      <button
        type="button"
        className="my-1.5 mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
