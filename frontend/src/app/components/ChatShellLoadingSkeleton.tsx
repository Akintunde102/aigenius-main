"use client";

import type { CSSProperties } from "react";
import React from "react";
import {
  workflowCanvasSurfaceStyle,
  workflowShellBgStyle,
} from "@/app/components/workflows/workflow-info";

function pulseBar(className: string) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200/70 dark:bg-zinc-700/55 ${className}`}
      aria-hidden
    />
  );
}

type ChatShellLoadingSkeletonProps = {
  /** Outer min-height; defaults to full viewport for standalone loading screens. */
  outerMinHeightStyle?: CSSProperties;
};

/**
 * Layout-aligned placeholder for chat shell loading (sidebar rail + main + composer).
 * Reduces CLS when swapping from loading to ModelInterface.
 */
export function ChatShellLoadingSkeleton({
  outerMinHeightStyle,
}: ChatShellLoadingSkeletonProps) {
  const shell = workflowShellBgStyle();
  const canvas = workflowCanvasSurfaceStyle();
  return (
    <div
      className="flex w-full flex-col md:flex-row md:min-h-0 md:flex-1"
      style={{
        ...shell,
        minHeight: "calc(var(--vh, 1vh) * 100)",
        ...outerMinHeightStyle,
      }}
    >
      <aside
        className="hidden min-h-0 w-[320px] shrink-0 flex-col gap-3 border-r border-slate-200/70 bg-white/90 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/90 md:flex"
        aria-hidden
      >
        {pulseBar("h-9 w-9 rounded-full bg-slate-200/80 dark:bg-zinc-700/70")}
        {pulseBar("mt-2 h-3 w-28")}
        <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">
          {pulseBar("h-10 w-full")}
          {pulseBar("h-10 w-full")}
          {pulseBar("h-10 w-full")}
          {pulseBar("h-10 w-full")}
          {pulseBar("h-10 w-full")}
        </div>
      </aside>
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={{
          ...canvas,
          minHeight: 0,
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col px-3 py-4 md:px-6">
          <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center">
            {pulseBar("h-4 w-56")}
            <div className="mt-3 h-3 w-40 rounded bg-slate-200/50 animate-pulse dark:bg-zinc-700/45" />
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-200/60 bg-white/95 px-3 py-3 dark:border-zinc-700/70 dark:bg-zinc-900/90 md:px-6">
          <div className="mx-auto h-[52px] max-w-[720px] rounded-xl bg-slate-100 animate-pulse dark:bg-zinc-800/90" />
        </div>
      </div>
    </div>
  );
}
