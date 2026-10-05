"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { DISPLAY } from "@/app/components/landing/typography";
import { BridgeStatusPanels } from "./components/BridgeStatusPanels";
import { DetailModal } from "./components/DetailModal";
import { ExplorerBrowseTable } from "./components/ExplorerBrowseTable";
import { ExplorerNavBar } from "./components/ExplorerNavBar";
import { FlatBrowseTable } from "./components/FlatBrowseTable";
import { SearchIndexPaginationFooter } from "./components/SearchIndexPaginationFooter";
import { SearchIndexToolbar } from "./components/SearchIndexToolbar";
import { useDesktopSearchIndex } from "./useDesktopSearchIndex";

export default function DesktopSearchIndexClient() {
  const state = useDesktopSearchIndex();
  const {
    bridgePhase,
    viewMode,
    layoutReady,
    canBrowse,
    scrollRef,
    rows,
    loadingList,
    explorerFolders,
    explorerFiles,
    explorerLoading,
    explorerMode,
  } = state;

  const showEmptyState =
    viewMode === "flat"
      ? rows.length === 0 && !loadingList
      : explorerFolders.length + explorerFiles.length === 0 && !explorerLoading;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-lp-bg text-lp-fg">
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full flex-1 flex-col px-4 py-6 sm:px-6",
            layoutReady ? "max-w-[min(96rem,calc(100vw-40px))] overflow-hidden" : "max-w-6xl overflow-y-auto overflow-x-hidden",
          )}
        >
          <div className={cn("flex shrink-0 flex-col gap-6 pb-4", layoutReady && "gap-4 pb-3")}>
            <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className={`${DISPLAY} text-3xl font-normal leading-[1.05] tracking-[-0.03em] sm:text-4xl`}>
                  Local search index
                </h1>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-lp-muted">
                  Inspect how the desktop indexer fills{" "}
                  <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-[0.9em] text-lp-fg dark:bg-white/[0.08]">file_index</code>
                  : folders, excerpts, previews, OS actions. Designed for auditing coverage and OCR/PDF ingestion.
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 text-sm font-medium text-lp-muted underline underline-offset-4 transition-colors duration-150 hover:text-lp-fg"
              >
                Back to chat
              </Link>
            </header>

            <BridgeStatusPanels bridgePhase={bridgePhase} canBrowse={canBrowse} />

            {layoutReady ? <SearchIndexToolbar {...state} /> : null}
          </div>

          {layoutReady ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/[0.03] pb-px dark:bg-white/[0.03]">
              {viewMode === "explorer" ? <ExplorerNavBar {...state} /> : null}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              >
                {viewMode === "explorer" ? (
                  <ExplorerBrowseTable {...state} />
                ) : (
                  <FlatBrowseTable {...state} />
                )}
                {showEmptyState ? (
                  <p className="p-8 text-center text-sm text-lp-muted">No matching records.</p>
                ) : null}
              </div>
              <SearchIndexPaginationFooter {...state} />
            </div>
          ) : null}
        </div>
      </div>
      <DetailModal {...state} />
    </>
  );
}