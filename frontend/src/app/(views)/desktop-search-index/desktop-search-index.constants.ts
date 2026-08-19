import type { InspectColumn } from "./desktop-search-index.types";

/** Server clamps browse listing to ≤200 rows. */
export const PAGE_LIMIT = 120;
export const FOLDER_PAGE_LIMIT = 80;
/** Extra tail slice from SQLite (characters). */
export const PREVIEW_TAIL_CHARS = 380;
/** Head slice for browse rows (characters). */
export const PREVIEW_HEAD_CHARS = 880;

export const ALL_COLUMNS: InspectColumn[] = [
  "actions",
  "folder",
  "name",
  "path",
  "extension",
  "mtime",
  "chars",
  "indexedContent",
  "tags",
];

export const COLUMN_LABELS: Record<InspectColumn, string> = {
  actions: "Actions",
  folder: "Folder",
  name: "Name",
  path: "Path",
  extension: "Ext",
  mtime: "Modified",
  chars: "Indexed length",
  indexedContent: "Indexed text (start … end)",
  tags: "Tags",
};

export const LS_COLUMNS_KEY = "aigenius-desktop-search-index-columns-v2";

export const SORT_HEADER_BTN =
  "inline-flex w-full max-w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500/50";
