"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { segmentExplorerLabel } from "../desktop-search-index.utils";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type ExplorerNavBarProps = Pick<
  DesktopSearchIndexState,
  | "explorerPath"
  | "setExplorerPath"
  | "explorerLoading"
  | "explorerParent"
  | "explorerBreadcrumbs"
  | "explorerMode"
  | "setExplorerFileOffset"
  | "setExplorerRootOffset"
>;

export function ExplorerNavBar(props: ExplorerNavBarProps) {
  const {
    explorerPath,
    setExplorerPath,
    explorerLoading,
    explorerParent,
    explorerBreadcrumbs,
    explorerMode,
    setExplorerFileOffset,
    setExplorerRootOffset,
  } = props;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/95 bg-[#1b1c1f]/98 px-2 py-2 sm:gap-3 sm:px-3">
      <button
        type="button"
        disabled={explorerPath.trim().length === 0 || explorerLoading}
        className="rounded border border-zinc-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-200 hover:bg-zinc-800 disabled:opacity-35"
        title={explorerParent == null ? "Already at top" : "Open parent folder"}
        onClick={() => {
          if (explorerPath.trim().length === 0) return;
          setExplorerFileOffset(0);
          setExplorerPath(explorerParent ?? "");
        }}
      >
        Up
      </button>
      <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[11px] text-zinc-400" aria-label="Path">
        <button
          type="button"
          className={cn(
            "max-w-[10rem] truncate rounded px-1 py-0.5 font-semibold hover:bg-zinc-800/70 hover:text-zinc-100 sm:max-w-xs",
            explorerPath.trim().length === 0 ? "text-zinc-100" : "text-zinc-400",
          )}
          onClick={() => {
            setExplorerFileOffset(0);
            setExplorerRootOffset(0);
            setExplorerPath("");
          }}
        >
          All indexed folders
        </button>
        {explorerBreadcrumbs.map((prefix) => (
          <Fragment key={prefix}>
            <span className="text-zinc-600" aria-hidden>
              ›
            </span>
            <button
              type="button"
              className="max-w-[14rem] truncate rounded px-1 py-0.5 hover:bg-zinc-800/70 hover:text-zinc-100"
              title={prefix}
              onClick={() => {
                setExplorerFileOffset(0);
                setExplorerPath(prefix);
              }}
            >
              {segmentExplorerLabel(prefix)}
            </button>
          </Fragment>
        ))}
      </nav>
      {explorerMode === "dir" ? (
        <p className="hidden max-w-xl truncate font-mono text-[10px] text-zinc-600 md:block" title={explorerPath}>
          {explorerPath}
        </p>
      ) : null}
    </div>
  );
}
