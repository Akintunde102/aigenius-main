import type { BrowseSortDir } from "../desktop-search-index.types";

export function FolderSortGlyph({ dir }: { dir: BrowseSortDir }) {
  return (
    <span aria-hidden className="ml-0.5 font-normal tabular-nums text-zinc-500">
      {dir === "asc" ? " ↑" : " ↓"}
    </span>
  );
}
