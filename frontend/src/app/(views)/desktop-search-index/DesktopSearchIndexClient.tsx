"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
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
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#0c0d0f] text-zinc-100">
        <div
          className={cn(
            "mx-auto flex min-h-0 w-full flex-1 flex-col px-3 py-4 sm:px-4",
            layoutReady ? "max-w-[min(96rem,calc(100vw-40px))] overflow-hidden" : "max-w-6xl overflow-y-auto overflow-x-hidden",
          )}
        >
          <div className={cn("flex shrink-0 flex-col gap-5 pb-4", layoutReady && "gap-4 pb-3")}>
            <header className="flex shrink-0 flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">Local search index</h1>
                <p className="mt-1 max-w-prose text-sm text-zinc-400">
                  Inspect how the desktop indexer fills <code className="text-zinc-300">file_index</code>: folders, excerpts,
                  previews, OS actions — designed for auditing coverage and OCR/PDF ingestion.
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 text-sm font-medium text-amber-200/90 underline-offset-4 hover:text-amber-100 hover:underline"
              >
                Back to chat
              </Link>
            </header>

            <BridgeStatusPanels bridgePhase={bridgePhase} canBrowse={canBrowse} />

            {layoutReady ? <SearchIndexToolbar {...state} /> : null}
          </div>

          {layoutReady ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-700/70 bg-[#101012]/80 pb-px shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
              {viewMode === "explorer" ? <ExplorerNavBar {...state} /> : null}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-[#0c0d0f]"
              >
                {viewMode === "explorer" ? (
                  <ExplorerBrowseTable {...state} />
                ) : (
                  <FlatBrowseTable {...state} />
                )}
                {showEmptyState ? (
                  <p className="p-8 text-center text-sm text-zinc-500">No matching records.</p>
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
