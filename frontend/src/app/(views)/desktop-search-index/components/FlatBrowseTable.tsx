"use client";

import type { JSX } from "react";
import { FiExternalLink, FiRotateCcw } from "react-icons/fi";
import { cn } from "@/lib/utils";
import { SORT_HEADER_BTN } from "../desktop-search-index.constants";
import {
  browseColumnAriaSort,
  COLUMN_LABELS,
} from "../desktop-search-index.utils";
import type { BrowseRow, BrowseSortColumn, InspectColumn } from "../desktop-search-index.types";
import type { DesktopSearchIndexState } from "../useDesktopSearchIndex";

type FlatBrowseTableProps = Pick<
  DesktopSearchIndexState,
  | "rows"
  | "visibleColumns"
  | "sortColumn"
  | "sortDir"
  | "onSortColumnClick"
  | "selectedPath"
  | "openDetailModalForPath"
  | "rescanningPaths"
  | "rescanPath"
  | "openInOs"
  | "revealInOs"
>;

export function FlatBrowseTable(props: FlatBrowseTableProps) {
  const {
    rows,
    visibleColumns,
    sortColumn,
    sortDir,
    onSortColumnClick,
    selectedPath,
    openDetailModalForPath,
    rescanningPaths,
    rescanPath,
    openInOs,
    revealInOs,
  } = props;

  const columnHeaderCellsFlat = (): JSX.Element[] => {
    const els: JSX.Element[] = [];

    const pushSortable = (
      col: InspectColumn | null,
      sortKey: BrowseSortColumn | null,
      label: string,
      className: string,
    ) => {
      if (!visibleColumns.includes(col as InspectColumn) || sortKey === null || col === null) return;
      els.push(
        <th key={sortKey} scope="col" className={className} aria-sort={browseColumnAriaSort(sortColumn, sortDir, sortKey)}>
          <button type="button" className={SORT_HEADER_BTN} onClick={() => onSortColumnClick(sortKey)}>
            {label}
            <span aria-hidden className="font-normal tabular-nums text-zinc-500">
              {sortColumn === sortKey ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </span>
          </button>
        </th>,
      );
    };

    const pushPlain = (col: InspectColumn, label: string, className: string) => {
      if (!visibleColumns.includes(col)) return;
      els.push(
        <th key={col} scope="col" className={className}>
          <span className={SORT_HEADER_BTN}>{label}</span>
        </th>,
      );
    };

    if (visibleColumns.includes("actions")) {
      els.push(
        <th
          key="actions"
          scope="col"
          className={cn(
            "sticky left-0 z-[10] px-2 py-2 backdrop-blur-md",
            "border-r border-zinc-700/85 bg-[#1a1a1e]/98 shadow-[1px_0_0_0_rgba(63,63,70,0.5)]",
          )}
        >
          <span className={SORT_HEADER_BTN}>Actions</span>
        </th>,
      );
    }
    pushSortable("folder", "folder", COLUMN_LABELS.folder, "hidden min-w-[8rem] px-2 py-2 xl:table-cell");
    pushSortable("name", "name", COLUMN_LABELS.name, "min-w-[6rem] max-w-[14rem] px-2 py-2");
    pushSortable("path", "path", COLUMN_LABELS.path, "min-w-[9rem] max-w-[42%] px-2 py-2");
    pushSortable("extension", "extension", COLUMN_LABELS.extension, "w-12 px-1 py-2 sm:w-14");
    pushSortable("mtime", "mtime", COLUMN_LABELS.mtime, "hidden min-w-[7.5rem] px-2 py-2 lg:table-cell");
    pushSortable("chars", "contentLength", COLUMN_LABELS.chars, "hidden w-[5.75rem] px-1 py-2 md:table-cell");
    pushPlain("indexedContent", COLUMN_LABELS.indexedContent, "min-w-[14rem] max-w-[39%] px-2 py-2");
    pushSortable("tags", "tags", COLUMN_LABELS.tags, "min-w-[6rem] max-w-[18%] px-2 py-2");

    return els;
  };

  const renderBrowseRowCells = (r: BrowseRow): JSX.Element[] => {
    const out: JSX.Element[] = [];

    const head = r.contentHead ?? r.contentPreview;
    const tail = r.contentTail ?? "";

    const openStop = (
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] font-medium hover:bg-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            openDetailModalForPath(r.path, "overview");
          }}
        >
          Detail
        </button>
        <button
          type="button"
          className="rounded border border-emerald-800/55 bg-emerald-950/20 px-2 py-0.5 text-[10px] font-medium text-emerald-100 hover:bg-emerald-950/35"
          onClick={(e) => {
            e.stopPropagation();
            openDetailModalForPath(r.path, "preview");
          }}
        >
          Preview
        </button>
        <button
          type="button"
          disabled={rescanningPaths.has(r.path)}
          className={cn(
            "inline-flex items-center gap-1 rounded border border-amber-900/50 bg-amber-950/10 px-2 py-0.5 text-[10px] font-medium text-amber-200 hover:bg-amber-950/30",
            rescanningPaths.has(r.path) && "animate-pulse cursor-wait opacity-70",
          )}
          onClick={(e) => {
            e.stopPropagation();
            void rescanPath(r.path);
          }}
        >
          <FiRotateCcw className={cn("h-2.5 w-2.5", rescanningPaths.has(r.path) && "animate-spin")} />
          {rescanningPaths.has(r.path) ? "Scanning..." : "Rescan"}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-zinc-600 px-2 py-0.5 text-[10px] font-medium hover:bg-zinc-700"
          onClick={(e) => {
            e.stopPropagation();
            void openInOs(r.path);
          }}
        >
          <FiExternalLink className="h-3 w-3" aria-hidden />
          Open
        </button>
        <button
          type="button"
          className="rounded border border-zinc-700 px-2 py-0.5 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800"
          onClick={(e) => {
            e.stopPropagation();
            void revealInOs(r.path);
          }}
        >
          Reveal
        </button>
      </div>
    );

    const cellClass = {
      sticky: cn(
        "sticky left-0 z-[8] backdrop-blur-md",
        selectedPath === r.path ? "bg-zinc-700/60" : "bg-[#141416]/98",
        "border-r border-zinc-800/90 shadow-[1px_0_0_0_rgba(63,63,70,0.3)]",
      ),
    };

    if (visibleColumns.includes("actions")) {
      out.push(
        <td
          key="a"
          className={cn("px-2 py-1.5 align-top", cellClass.sticky)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {openStop}
        </td>,
      );
    }
    if (visibleColumns.includes("folder")) {
      out.push(
        <td key="f" className={cn("hidden max-w-[1px] py-1.5 xl:table-cell")}>
          <div className="break-all px-2 font-mono text-[10px] text-zinc-500">{r.folderPath ?? "—"}</div>
        </td>,
      );
    }
    if (visibleColumns.includes("name")) {
      out.push(
        <td key="n" className="max-w-[1px] py-1.5">
          <div className="break-words px-2 text-[11px] text-zinc-100 sm:text-sm">{r.name}</div>
        </td>,
      );
    }
    if (visibleColumns.includes("path")) {
      out.push(
        <td key="p" className="max-w-[1px] py-1.5">
          <div className="break-all px-2 font-mono text-[11px] text-zinc-200 sm:text-xs sm:leading-snug">{r.path}</div>
        </td>,
      );
    }
    if (visibleColumns.includes("extension")) {
      out.push(
        <td key="x" className="border-l border-transparent px-1 py-1.5 text-center tabular-nums">
          <span className="text-[11px] font-medium text-zinc-400">{r.extension || "—"}</span>
        </td>,
      );
    }
    if (visibleColumns.includes("mtime")) {
      out.push(
        <td key="m" className="hidden border-l border-zinc-800/40 px-2 py-1.5 text-xs whitespace-nowrap text-zinc-500 lg:table-cell">
          {new Date(r.mtime).toLocaleString()}
        </td>,
      );
    }
    if (visibleColumns.includes("chars")) {
      out.push(
        <td key="c" className="hidden border-l border-zinc-800/40 px-2 py-1.5 text-right font-mono text-[11px] tabular-nums text-zinc-500 md:table-cell">
          {r.contentChars != null ? r.contentChars : "—"}
        </td>,
      );
    }
    if (visibleColumns.includes("indexedContent")) {
      out.push(
        <td key="ic" className="border-l border-zinc-800/35 px-2 py-1.5 align-top text-[10px] leading-snug">
          <div className="max-h-28 overflow-y-auto rounded-lg border border-zinc-800/60 bg-black/35 px-2 py-1.5 text-zinc-400">
            {head.length > 0 ? <pre className="whitespace-pre-wrap break-all font-mono">{head}</pre> : "(empty slice)"}
            {tail.length > 0 ? (
              <>
                <p className="my-2 text-center font-sans text-[9px] font-semibold tracking-wider text-zinc-600 uppercase">
                  ···
                </p>
                <pre className="whitespace-pre-wrap break-all font-mono">{tail}</pre>
              </>
            ) : null}
          </div>
        </td>,
      );
    }
    if (visibleColumns.includes("tags")) {
      out.push(
        <td key="t" className="border-l border-zinc-800/40 px-2 py-1.5 text-xs leading-snug break-words text-zinc-500">
          {r.tags || "—"}
        </td>,
      );
    }
    return out;
  };

  return (
    <table className="min-w-full divide-y divide-zinc-800/95 text-left text-sm">
      <thead className="sticky top-0 z-[2] bg-[#17171a]/98 shadow-[0_1px_0_0_rgb(63_63_70_/_0.9)] backdrop-blur-sm">
        <tr className="text-zinc-400">{columnHeaderCellsFlat()}</tr>
      </thead>
      <tbody className="divide-y divide-zinc-800/70">
        {rows.map((r) => (
          <tr
            key={r.path}
            className={cn(
              "transition-colors hover:bg-zinc-800/50",
              "cursor-pointer",
              selectedPath === r.path ? "bg-zinc-700/35 ring-1 ring-zinc-500/30" : "bg-transparent",
            )}
            role="button"
            tabIndex={0}
            onClick={() => openDetailModalForPath(r.path, "overview")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDetailModalForPath(r.path, "overview");
              }
            }}
          >
            {renderBrowseRowCells(r)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
