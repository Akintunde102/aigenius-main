"use client";

import { FOLDER_PAGE_LIMIT, PAGE_LIMIT } from "../desktop-search-index.constants";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type SearchIndexPaginationFooterProps = Pick<
  DesktopSearchIndexState,
  | "viewMode"
  | "offset"
  | "setOffset"
  | "rows"
  | "total"
  | "loadingList"
  | "explorerMode"
  | "explorerRootOffset"
  | "setExplorerRootOffset"
  | "explorerFolders"
  | "explorerTotalRootFolders"
  | "explorerLoading"
  | "explorerFileOffset"
  | "setExplorerFileOffset"
  | "explorerFiles"
  | "explorerTotalFilesHere"
  | "scrollRef"
>;

export function SearchIndexPaginationFooter(props: SearchIndexPaginationFooterProps) {
  const {
    viewMode,
    offset,
    setOffset,
    rows,
    total,
    loadingList,
    explorerMode,
    explorerRootOffset,
    setExplorerRootOffset,
    explorerFolders,
    explorerTotalRootFolders,
    explorerLoading,
    explorerFileOffset,
    setExplorerFileOffset,
    explorerFiles,
    explorerTotalFilesHere,
    scrollRef,
  } = props;

  return (
    <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-800/95 bg-[#161618]/98 px-3 py-2.5 backdrop-blur-sm sm:px-4">
      <span className="max-w-xl text-[11px] leading-snug text-zinc-500">
        Rows use indexed text (SQLite) for excerpts; Preview uses disk when available. Indexed length comes from SQLite
        <code className="mx-1 text-zinc-400"> LENGTH(content)</code>.
        {viewMode === "explorer" ? " Explorer lists subfolders from a capped subtree scan." : ""}
      </span>
      <div className="flex gap-2">
        {viewMode === "flat" ? (
          <>
            <button
              type="button"
              disabled={offset === 0 || loadingList}
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => {
                setOffset((o) => Math.max(0, o - PAGE_LIMIT));
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + rows.length >= total || loadingList}
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => {
                setOffset((o) => o + PAGE_LIMIT);
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Next
            </button>
          </>
        ) : explorerMode === "root" ? (
          <>
            <button
              type="button"
              disabled={explorerRootOffset === 0 || explorerLoading}
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => setExplorerRootOffset((o) => Math.max(0, o - FOLDER_PAGE_LIMIT))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={
                explorerRootOffset + explorerFolders.length >= explorerTotalRootFolders || explorerLoading
              }
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => setExplorerRootOffset((o) => o + FOLDER_PAGE_LIMIT)}
            >
              Next
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={explorerFileOffset === 0 || explorerLoading}
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => setExplorerFileOffset((o) => Math.max(0, o - PAGE_LIMIT))}
            >
              Previous files
            </button>
            <button
              type="button"
              disabled={
                explorerFileOffset + explorerFiles.length >= explorerTotalFilesHere || explorerLoading
              }
              className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-35"
              onClick={() => setExplorerFileOffset((o) => o + PAGE_LIMIT)}
            >
              Next files
            </button>
          </>
        )}
      </div>
    </footer>
  );
}
