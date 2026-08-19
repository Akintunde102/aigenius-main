export type BrowseRow = {
  path: string;
  name: string;
  folderPath?: string;
  mtime: number;
  extension: string;
  tags: string;
  contentPreview: string;
  contentHead?: string;
  contentTail?: string;
  contentChars?: number;
};

export type ExplorerFolderRow = {
  folderPath: string;
  name: string;
  fileCountRecursive: number;
  maxMtime: number;
};

export type DetailOk = {
  path: string;
  name: string;
  mtime: number;
  extension: string;
  tags: string;
  content: string;
  contentTruncated: boolean;
};

export type InspectColumn =
  | "actions"
  | "folder"
  | "name"
  | "path"
  | "extension"
  | "mtime"
  | "chars"
  | "indexedContent"
  | "tags";

export type DesktopBridgePhase = "pending" | "ready" | "unavailable";
export type InspectViewMode = "flat" | "explorer";
export type BrowseSortDir = "asc" | "desc";
export type BrowseSortColumn =
  | "path"
  | "name"
  | "folder"
  | "mtime"
  | "extension"
  | "tags"
  | "contentLength"
  | "chars";
export type FolderAggSortKey = "folder" | "files" | "recent";
export type DetailModalTab = "overview" | "preview" | "json";

export type PreviewBlob =
  | { kind: "image"; mimeType: string; url: string }
  | { kind: "text"; text: string };

export type IndexerHealth = {
  queue_depth?: number;
  scan_in_progress?: boolean;
  project_root?: string | null;
  health?: {
    indexer_ipc_reachable: boolean;
    db_integrity: string;
    last_error: string | null;
    queue_text_depth: number;
    queue_structure_depth: number;
  };
};
