import {
  ALL_COLUMNS,
  COLUMN_LABELS,
  LS_COLUMNS_KEY,
} from "./desktop-search-index.constants";
import type {
  BrowseSortColumn,
  BrowseSortDir,
  DetailOk,
  FolderAggSortKey,
  InspectColumn,
} from "./desktop-search-index.types";

export { ALL_COLUMNS, COLUMN_LABELS };

export function defaultVisibleColumns(): InspectColumn[] {
  return [...ALL_COLUMNS];
}

export function readVisibleColumns(): InspectColumn[] {
  if (typeof window === "undefined") return defaultVisibleColumns();
  try {
    const raw = window.localStorage.getItem(LS_COLUMNS_KEY);
    if (!raw) return defaultVisibleColumns();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultVisibleColumns();
    const uniq = Array.from(
      new Set(parsed.filter((x) => ALL_COLUMNS.includes(x as InspectColumn))),
    ) as InspectColumn[];
    if (uniq.includes("actions") === false) {
      uniq.unshift("actions");
    }
    return uniq.length > 0 ? uniq : defaultVisibleColumns();
  } catch {
    return defaultVisibleColumns();
  }
}

export function writeVisibleColumns(cols: InspectColumn[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota */
  }
}

export function indexedFileRowToJson(detail: DetailOk): Record<string, unknown> {
  const tagsStored = typeof detail.tags === "string" ? detail.tags.trim() : "";
  return {
    path: detail.path,
    name: detail.name,
    mtime_ms: detail.mtime,
    mtime_iso: new Date(detail.mtime).toISOString(),
    extension: detail.extension ?? "",
    tags: tagsStored,
    tags_tokens: tagsStored.length > 0 ? tagsStored.split(/\s+/).filter(Boolean) : [],
    content: detail.content,
    content_truncated_flag: detail.contentTruncated,
    content_length_chars_approx: detail.content.length,
    content_preview_120: detail.content.slice(0, 120),
  };
}

export function sortDirBootstrap(column: BrowseSortColumn): BrowseSortDir {
  return column === "mtime" || column === "contentLength" ? "desc" : "asc";
}

export function browseColumnAriaSort(
  activeColumn: BrowseSortColumn,
  dir: BrowseSortDir,
  column: BrowseSortColumn,
): "none" | "ascending" | "descending" {
  if (activeColumn !== column) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

/** Last path segment for breadcrumb pills (browser-safe; no Node `path`). */
export function segmentExplorerLabel(absPath: string): string {
  const trimmed = absPath.trim();
  if (!trimmed) return absPath;
  const parts = trimmed.split(/[/\\]/).filter((p) => p.length > 0);
  if (parts.length === 0) return trimmed;
  return parts[parts.length - 1] ?? trimmed;
}

export function browseFolderAggAria(
  active: FolderAggSortKey,
  dir: BrowseSortDir,
  column: FolderAggSortKey,
): "none" | "ascending" | "descending" {
  if (active !== column) return "none";
  return dir === "asc" ? "ascending" : "descending";
}
