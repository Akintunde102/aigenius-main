"use client";

import { FiExternalLink, FiFile, FiFolder } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { SORT_HEADER_BTN } from "../desktop-search-index.constants";
import { browseColumnAriaSort, browseFolderAggAria } from "../desktop-search-index.utils";
import { FolderSortGlyph } from "./FolderSortGlyph";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type ExplorerBrowseTableProps = Pick<
  DesktopSearchIndexState,
  | "explorerMode"
  | "explorerRootSort"
  | "explorerFileSort"
  | "onSortExplorerRootClick"
  | "onSortExplorerFileColumnClick"
  | "explorerFolders"
  | "explorerFiles"
  | "setExplorerFileOffset"
  | "setExplorerPath"
  | "openInOs"
  | "selectedPath"
  | "openDetailModalForPath"
  | "revealInOs"
>;

export function ExplorerBrowseTable(props: ExplorerBrowseTableProps) {
  const {
    explorerMode,
    explorerRootSort,
    explorerFileSort,
    onSortExplorerRootClick,
    onSortExplorerFileColumnClick,
    explorerFolders,
    explorerFiles,
    setExplorerFileOffset,
    setExplorerPath,
    openInOs,
    selectedPath,
    openDetailModalForPath,
    revealInOs,
  } = props;

  return (
    <table className="min-w-full table-fixed divide-y divide-zinc-800/95 border-collapse text-left text-[13px]">
      <thead className="sticky top-0 z-[2] border-b border-zinc-700/90 bg-[#252628]/98 backdrop-blur-sm">
        <tr className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
          {explorerMode === "root" ? (
            <>
              <th scope="col" className="min-w-0 px-3 py-2">
                <button
                  type="button"
                  className={SORT_HEADER_BTN}
                  aria-sort={browseFolderAggAria(explorerRootSort.sortBy, explorerRootSort.sortDir, "folder")}
                  onClick={() => onSortExplorerRootClick("folder")}
                >
                  Name
                  {explorerRootSort.sortBy === "folder" ? (
                    <FolderSortGlyph dir={explorerRootSort.sortDir} />
                  ) : null}
                </button>
              </th>
              <th scope="col" className="hidden w-[11rem] px-2 py-2 sm:table-cell">
                <button
                  type="button"
                  className={SORT_HEADER_BTN}
                  aria-sort={browseFolderAggAria(explorerRootSort.sortBy, explorerRootSort.sortDir, "recent")}
                  onClick={() => onSortExplorerRootClick("recent")}
                >
                  Date modified
                  {explorerRootSort.sortBy === "recent" ? (
                    <FolderSortGlyph dir={explorerRootSort.sortDir} />
                  ) : null}
                </button>
              </th>
              <th scope="col" className="w-[7.25rem] px-2 py-2">Type</th>
              <th scope="col" className="w-[6.25rem] px-2 py-2 text-right">
                <button
                  type="button"
                  className={cn(SORT_HEADER_BTN, "justify-end")}
                  aria-sort={browseFolderAggAria(explorerRootSort.sortBy, explorerRootSort.sortDir, "files")}
                  onClick={() => onSortExplorerRootClick("files")}
                >
                  Indexed files
                  {explorerRootSort.sortBy === "files" ? (
                    <FolderSortGlyph dir={explorerRootSort.sortDir} />
                  ) : null}
                </button>
              </th>
              <th scope="col" className="w-[7.75rem] px-2 py-2 text-[10px]">
                Actions
              </th>
            </>
          ) : (
            <>
              <th scope="col" className="min-w-0 px-3 py-2">
                <button
                  type="button"
                  className={SORT_HEADER_BTN}
                  aria-sort={browseColumnAriaSort(explorerFileSort.column, explorerFileSort.dir, "name")}
                  onClick={() => onSortExplorerFileColumnClick("name")}
                >
                  Name
                  <span aria-hidden className="font-normal tabular-nums text-zinc-500">
                    {explorerFileSort.column === "name"
                      ? explorerFileSort.dir === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </span>
                </button>
              </th>
              <th scope="col" className="hidden w-[11rem] px-2 py-2 sm:table-cell">
                <button
                  type="button"
                  className={SORT_HEADER_BTN}
                  aria-sort={browseColumnAriaSort(explorerFileSort.column, explorerFileSort.dir, "mtime")}
                  onClick={() => onSortExplorerFileColumnClick("mtime")}
                >
                  Date modified
                  <span aria-hidden className="font-normal tabular-nums text-zinc-500">
                    {explorerFileSort.column === "mtime"
                      ? explorerFileSort.dir === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </span>
                </button>
              </th>
              <th scope="col" className="w-[7.25rem] px-2 py-2">
                <button
                  type="button"
                  className={SORT_HEADER_BTN}
                  aria-sort={browseColumnAriaSort(explorerFileSort.column, explorerFileSort.dir, "extension")}
                  onClick={() => onSortExplorerFileColumnClick("extension")}
                >
                  Type
                  <span aria-hidden className="font-normal tabular-nums text-zinc-500">
                    {explorerFileSort.column === "extension"
                      ? explorerFileSort.dir === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </span>
                </button>
              </th>
              <th scope="col" className="w-[6.75rem] px-2 py-2 text-right">
                <button
                  type="button"
                  className={cn(SORT_HEADER_BTN, "justify-end")}
                  aria-sort={browseColumnAriaSort(
                    explorerFileSort.column,
                    explorerFileSort.dir,
                    "contentLength",
                  )}
                  onClick={() => onSortExplorerFileColumnClick("contentLength")}
                >
                  Size
                  <span aria-hidden className="font-normal tabular-nums text-zinc-500">
                    {explorerFileSort.column === "contentLength"
                      ? explorerFileSort.dir === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </span>
                </button>
              </th>
              <th scope="col" className="w-[7.75rem] px-2 py-2">
                Actions
              </th>
            </>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/[0.55] bg-[#101012]/50">
        {explorerFolders.map((f) => (
          <tr
            key={`d-${f.folderPath}`}
            role="button"
            tabIndex={0}
            className="h-8 cursor-pointer hover:bg-zinc-800/40"
            onDoubleClick={() => {
              setExplorerFileOffset(0);
              setExplorerPath(f.folderPath);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setExplorerFileOffset(0);
                setExplorerPath(f.folderPath);
              }
            }}
          >
            <td className="min-w-0 px-3 py-1.5 align-middle">
              <div className="flex min-w-0 items-center gap-2">
                <FiFolder className="h-4 w-4 shrink-0 text-amber-200/90" aria-hidden />
                <span className="min-w-0 truncate text-zinc-100" title={f.folderPath}>
                  {f.name || f.folderPath || "—"}
                </span>
              </div>
            </td>
            <td className="hidden px-2 py-1.5 align-middle text-xs whitespace-nowrap text-zinc-500 sm:table-cell">
              {new Date(f.maxMtime).toLocaleString()}
            </td>
            <td className="px-2 py-1.5 align-middle text-xs text-zinc-500">File folder</td>
            <td className="px-2 py-1.5 text-right align-middle font-mono text-xs tabular-nums text-zinc-400">
              {f.fileCountRecursive} items
            </td>
            <td className="px-2 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] font-medium hover:bg-zinc-800"
                onClick={() => void openInOs(f.folderPath)}
              >
                Open
              </button>
            </td>
          </tr>
        ))}
        {explorerMode === "dir"
          ? explorerFiles.map((r) => (
            <tr
              key={r.path}
              role="button"
              tabIndex={0}
              className={cn(
                "h-8 cursor-pointer hover:bg-zinc-800/40",
                selectedPath === r.path ? "bg-zinc-700/25 ring-1 ring-zinc-500/20" : "bg-transparent",
              )}
              onClick={() => openDetailModalForPath(r.path, "overview")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDetailModalForPath(r.path, "overview");
                }
              }}
            >
              <td className="min-w-0 px-3 py-1.5 align-middle">
                <div className="flex min-w-0 items-center gap-2">
                  <FiFile className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                  <span className="min-w-0 truncate text-zinc-100" title={r.path}>
                    {r.name}
                  </span>
                </div>
              </td>
              <td className="hidden px-2 py-1.5 align-middle text-xs whitespace-nowrap text-zinc-500 sm:table-cell">
                {new Date(r.mtime).toLocaleString()}
              </td>
              <td className="truncate px-2 py-1.5 align-middle text-xs text-zinc-400" title={r.extension}>
                {r.extension ? `${r.extension} file` : "File"}
              </td>
              <td className="px-2 py-1.5 text-right align-middle font-mono text-xs tabular-nums text-zinc-400">
                {r.contentChars != null ? r.contentChars : "—"}
              </td>
              <td className="px-2 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] font-medium hover:bg-zinc-800"
                    onClick={() => openDetailModalForPath(r.path, "overview")}
                  >
                    Detail
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800"
                    onClick={() => void revealInOs(r.path)}
                  >
                    Reveal
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-zinc-600 px-1.5 py-0.5 text-[10px] font-medium hover:bg-zinc-800"
                    onClick={() => void openInOs(r.path)}
                  >
                    <FiExternalLink className="h-3 w-3" aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))
          : null}
      </tbody>
    </table>
  );
}
