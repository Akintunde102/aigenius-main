"use client";

import { cn } from "@/lib/utils";
import { ALL_COLUMNS, COLUMN_LABELS } from "../desktop-search-index.utils";
import { FOLDER_PAGE_LIMIT, PAGE_LIMIT } from "../desktop-search-index.constants";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type SearchIndexToolbarProps = Pick<
  DesktopSearchIndexState,
  | "indexerHealth"
  | "ignoreOpen"
  | "setIgnoreOpen"
  | "ignoreContent"
  | "setIgnoreContent"
  | "ignoreRoot"
  | "ignoreSaving"
  | "saveAigeniusIgnore"
  | "viewMode"
  | "canExplorer"
  | "switchViewMode"
  | "pathContains"
  | "setPathContains"
  | "contentContains"
  | "setContentContains"
  | "extension"
  | "setExtension"
  | "loadingList"
  | "explorerLoading"
  | "applyFilters"
  | "resetFilters"
  | "columnsPopoverOpen"
  | "setColumnsPopoverOpen"
  | "visibleColumns"
  | "toggleColumnVisible"
  | "resetColumnsVisible"
  | "listError"
  | "explorerError"
  | "rows"
  | "total"
  | "offset"
  | "explorerMode"
  | "explorerFolders"
  | "explorerRootOffset"
  | "explorerTotalRootFolders"
  | "explorerFiles"
  | "explorerFileOffset"
  | "explorerTotalFilesHere"
  | "explorerSubtreeTruncated"
>;

export function SearchIndexToolbar(props: SearchIndexToolbarProps) {
  const {
    indexerHealth,
    ignoreOpen,
    setIgnoreOpen,
    ignoreContent,
    setIgnoreContent,
    ignoreRoot,
    ignoreSaving,
    saveAigeniusIgnore,
    viewMode,
    canExplorer,
    switchViewMode,
    pathContains,
    setPathContains,
    contentContains,
    setContentContains,
    extension,
    setExtension,
    loadingList,
    explorerLoading,
    applyFilters,
    resetFilters,
    columnsPopoverOpen,
    setColumnsPopoverOpen,
    visibleColumns,
    toggleColumnVisible,
    resetColumnsVisible,
    listError,
    explorerError,
    rows,
    total,
    offset,
    explorerMode,
    explorerFolders,
    explorerRootOffset,
    explorerTotalRootFolders,
    explorerFiles,
    explorerFileOffset,
    explorerTotalFilesHere,
    explorerSubtreeTruncated,
  } = props;

  return (
    <>
      {indexerHealth ? (
        <div className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              IPC:{" "}
              <span className={indexerHealth.health?.indexer_ipc_reachable !== false ? "text-emerald-300" : "text-red-300"}>
                {indexerHealth.health?.indexer_ipc_reachable !== false ? "ok" : "down"}
              </span>
            </span>
            <span>Queue: {indexerHealth.queue_depth ?? 0}</span>
            <span>Text: {indexerHealth.health?.queue_text_depth ?? 0}</span>
            <span>Structure: {indexerHealth.health?.queue_structure_depth ?? 0}</span>
            <span>
              Scan: {indexerHealth.scan_in_progress ? "active" : "idle"}
            </span>
            {indexerHealth.health?.last_error ? (
              <span className="text-amber-200">Last error: {indexerHealth.health.last_error}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-700/70 bg-zinc-900/40 p-3">
        <button
          type="button"
          className="text-xs font-medium text-amber-200/90 hover:underline"
          onClick={() => setIgnoreOpen((v) => !v)}
        >
          {ignoreOpen ? "Hide" : "Edit"} .aigeniusignore {ignoreRoot ? `(${ignoreRoot})` : ""}
        </button>
        {ignoreOpen ? (
          <div className="mt-2 flex flex-col gap-2">
            <textarea
              value={ignoreContent}
              onChange={(e) => setIgnoreContent(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 font-mono text-xs text-zinc-100"
              placeholder="# gitignore-style patterns, one per line"
            />
            <button
              type="button"
              disabled={!ignoreRoot || ignoreSaving}
              className="self-start rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 disabled:opacity-50"
              onClick={() => void saveAigeniusIgnore()}
            >
              {ignoreSaving ? "Saving…" : "Save .aigeniusignore"}
            </button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">View mode</span>
          <div className="flex rounded-xl border border-zinc-700/90 bg-zinc-900/60 p-1">
            {(
              [
                ["flat", "Flat rows"],
                ["explorer", "File explorer"],
              ] as const
            ).map(([id, lab]) => (
              <button
                key={id}
                type="button"
                disabled={id === "explorer" && !canExplorer}
                title={
                  id === "explorer" && !canExplorer
                    ? "Update the desktop app + sidecar for searchExplorer (compile + rebuild desktop-server)."
                    : undefined
                }
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                  viewMode === id
                    ? "bg-zinc-700 text-zinc-50 shadow-inner"
                    : "text-zinc-400 hover:text-zinc-200",
                )}
                onClick={() => switchViewMode(id)}
              >
                {lab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex shrink-0 flex-wrap items-end gap-2 gap-y-2 sm:gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-zinc-400">
          Path contains
          <input
            type="text"
            value={pathContains}
            onChange={(e) => setPathContains(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 shadow-inner placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
            placeholder="e.g. Documents"
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs text-zinc-400">
          Content contains
          <input
            type="text"
            value={contentContains}
            onChange={(e) => setContentContains(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 shadow-inner placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
            placeholder="Indexed text substring (apply)"
            title="Case-insensitive match on SQLite stored content (substring search)."
          />
        </label>
        <label className="flex w-[5.25rem] flex-col gap-1 text-xs text-zinc-400 sm:w-36">
          Ext
          <input
            type="text"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/40"
            placeholder="png"
            title="Matches indexed extension or path ending (e.g. png, tar.gz)."
          />
        </label>
        <button
          type="button"
          disabled={loadingList || explorerLoading}
          className={cn(
            "rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 shadow-sm",
            loadingList || explorerLoading ? "opacity-60" : "hover:bg-zinc-700",
          )}
          onClick={applyFilters}
        >
          {loadingList || explorerLoading ? "Loading…" : "Apply"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          onClick={resetFilters}
        >
          Reset
        </button>
        <div className="relative">
          <button
            type="button"
            className="rounded-lg border border-zinc-600 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
            aria-expanded={columnsPopoverOpen}
            onClick={() => setColumnsPopoverOpen((x) => !x)}
          >
            Columns ({visibleColumns.length})
          </button>
          {columnsPopoverOpen ? (
            <div
              className={cn(
                "absolute right-0 bottom-full z-30 mb-2 w-[14.5rem] select-none rounded-xl border border-zinc-600 bg-[#17171a]",
                "p-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]",
              )}
            >
              <div className="mb-3 flex justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">Visible columns</p>
                <button
                  type="button"
                  className="text-[11px] text-amber-200/95 hover:underline"
                  onClick={resetColumnsVisible}
                >
                  Default
                </button>
              </div>
              <ul className="max-h-[14rem] space-y-1.5 overflow-y-auto text-xs">
                {ALL_COLUMNS.map((cid) => (
                  <li key={cid} className="flex items-start gap-2">
                    <input
                      id={`col-vis-${cid}`}
                      type="checkbox"
                      className="mt-0.5 rounded border-zinc-600 accent-amber-500"
                      checked={visibleColumns.includes(cid)}
                      disabled={cid === "actions"}
                      onChange={() => toggleColumnVisible(cid)}
                    />
                    <label htmlFor={`col-vis-${cid}`} className="cursor-pointer text-zinc-200">
                      {COLUMN_LABELS[cid]}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {columnsPopoverOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-transparent"
          aria-label="Close column picker backdrop"
          onClick={() => setColumnsPopoverOpen(false)}
        />
      ) : null}

      {listError ? <p className="shrink-0 text-sm font-medium text-red-300">{listError}</p> : null}
      {explorerError ? <p className="shrink-0 text-sm font-medium text-red-300">{explorerError}</p> : null}

      <p className="shrink-0 text-xs tabular-nums text-zinc-500">
        {viewMode === "flat" ? (
          <>
            File rows ({PAGE_LIMIT} / page ·{" "}
            {total === 0
              ? "0 of 0"
              : rows.length === 0
                ? `no rows on this page (${total} matched)`
                : `${offset + 1}–${offset + rows.length} of ${total}`}
            ){loadingList ? " · fetching…" : ""}
          </>
        ) : explorerMode === "root" ? (
          <>
            Indexed folder groups ({FOLDER_PAGE_LIMIT} / page ·{" "}
            {explorerFolders.length === 0 ? 0 : explorerRootOffset + 1}–
            {explorerRootOffset + explorerFolders.length} of {explorerTotalRootFolders}
            ){explorerLoading ? " · fetching…" : ""}
          </>
        ) : (
          <>
            Explorer · {explorerFolders.length} folder{explorerFolders.length === 1 ? "" : "s"} · Files (
            {PAGE_LIMIT} / page · {explorerTotalFilesHere === 0 ? 0 : explorerFileOffset + 1}
            –
            {explorerFileOffset + explorerFiles.length} of {explorerTotalFilesHere})
            {explorerLoading ? " · fetching…" : ""}
            {explorerSubtreeTruncated ? " · partial subtree scan (limit)" : ""}
          </>
        )}
      </p>
    </>
  );
}
