"use client";

import { LayoutGrid, MoreHorizontal, RefreshCw, Rows3 } from "lucide-react";
import type { ViewMode } from "./user-files-browser.types";


export function MoreOptionsMenu({
  viewMode,
  onViewModeChange,
  onRefresh,
}: {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onRefresh: () => void;
}) {
  return (
    <details className="group relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        <span className="sr-only">More options</span>
      </summary>
      <div
        className="absolute right-0 z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewModeChange("gallery");
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${viewMode === "gallery" ? "font-semibold text-cyan-700" : ""
            }`}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Gallery view
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewModeChange("list");
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${viewMode === "list" ? "font-semibold text-cyan-700" : ""
            }`}
        >
          <Rows3 className="h-4 w-4" aria-hidden />
          List view
        </button>
        <div className="my-1 border-t border-gray-100" />
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRefresh();
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>
    </details>
  );
}