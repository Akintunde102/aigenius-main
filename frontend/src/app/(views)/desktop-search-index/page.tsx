"use client";

import Link from "next/link";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
} from "react";
import { createPortal } from "react-dom";
import { FiExternalLink, FiFile, FiFolder, FiX, FiFilter, FiRotateCcw, FiChevronLeft, FiChevronRight, FiList, FiBox } from "react-icons/fi";
import {
  getAigeniusDesktopBridgeFromBrowsingContext,
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  isLikelyElectronRenderer,
  waitForAigeniusDesktopBridge,
} from "@/lib/utils/desktop-runtime";
import { cn } from "@/lib/utils";

/** Server clamps browse listing to ≤200 rows. */
const PAGE_LIMIT = 120;
const FOLDER_PAGE_LIMIT = 80;
/** Extra tail slice from SQLite (characters). */
const PREVIEW_TAIL_CHARS = 380;
/** Head slice for browse rows (characters). */
const PREVIEW_HEAD_CHARS = 880;

type BrowseRow = {
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

type ExplorerFolderRow = {
  folderPath: string;
  name: string;
  fileCountRecursive: number;
  maxMtime: number;
};

type DetailOk = {
  path: string;
  name: string;
  mtime: number;
  extension: string;
  tags: string;
  content: string;
  contentTruncated: boolean;
};

type InspectColumn =
  | "actions"
  | "folder"
  | "name"
  | "path"
  | "extension"
  | "mtime"
  | "chars"
  | "indexedContent"
  | "tags";

type DesktopBridgePhase = "pending" | "ready" | "unavailable";
type InspectViewMode = "flat" | "explorer";
type BrowseSortDir = "asc" | "desc";
type BrowseSortColumn = "path" | "name" | "folder" | "mtime" | "extension" | "tags" | "contentLength" | "chars";
type FolderAggSortKey = "folder" | "files" | "recent";
type DetailModalTab = "overview" | "preview" | "json";

const ALL_COLUMNS: InspectColumn[] = [
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

const COLUMN_LABELS: Record<InspectColumn, string> = {
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

function defaultVisibleColumns(): InspectColumn[] {
  return [...ALL_COLUMNS];
}

const LS_COLUMNS_KEY = "aigenius-desktop-search-index-columns-v2";

function readVisibleColumns(): InspectColumn[] {
  if (typeof window === "undefined") return defaultVisibleColumns();
  try {
    const raw = window.localStorage.getItem(LS_COLUMNS_KEY);
    if (!raw) return defaultVisibleColumns();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultVisibleColumns();
    const uniq = Array.from(new Set(parsed.filter((x) => ALL_COLUMNS.includes(x as InspectColumn)))) as InspectColumn[];
    if (uniq.includes("actions") === false) {
      uniq.unshift("actions");
    }
    return uniq.length > 0 ? uniq : defaultVisibleColumns();
  } catch {
    return defaultVisibleColumns();
  }
}

function writeVisibleColumns(cols: InspectColumn[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_COLUMNS_KEY, JSON.stringify(cols));
  } catch {
    /* ignore quota */
  }
}

function indexedFileRowToJson(detail: DetailOk): Record<string, unknown> {
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



function sortDirBootstrap(column: BrowseSortColumn): BrowseSortDir {
  return column === "mtime" || column === "contentLength" ? "desc" : "asc";
}

function browseColumnAriaSort(
  activeColumn: BrowseSortColumn,
  dir: BrowseSortDir,
  column: BrowseSortColumn,
): "none" | "ascending" | "descending" {
  if (activeColumn !== column) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

const SORT_HEADER_BTN =
  "inline-flex w-full max-w-full items-center gap-0.5 rounded px-1 py-0.5 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 hover:bg-zinc-800/90 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500/50";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function DesktopSearchIndexPage() {
  const [bridgePhase, setBridgePhase] = useState<DesktopBridgePhase>("pending");
  const [viewMode, setViewMode] = useState<InspectViewMode>("flat");
  const [pathContains, setPathContains] = useState("");
  const [contentContains, setContentContains] = useState("");
  const [extension, setExtension] = useState("");

  const debouncedPath = useDebounce(pathContains, 450);
  const debouncedContent = useDebounce(contentContains, 450);
  const debouncedExt = useDebounce(extension, 450);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<BrowseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);

  const [explorerPath, setExplorerPath] = useState("");
  const [explorerRootOffset, setExplorerRootOffset] = useState(0);
  const [explorerFileOffset, setExplorerFileOffset] = useState(0);
  const [explorerFolders, setExplorerFolders] = useState<ExplorerFolderRow[]>([]);
  const [explorerFiles, setExplorerFiles] = useState<BrowseRow[]>([]);
  const [explorerMode, setExplorerMode] = useState<"root" | "dir">("root");
  const [explorerTotalRootFolders, setExplorerTotalRootFolders] = useState(0);
  const [explorerTotalFilesHere, setExplorerTotalFilesHere] = useState(0);
  const [explorerParent, setExplorerParent] = useState<string | null>(null);
  const [explorerBreadcrumbs, setExplorerBreadcrumbs] = useState<string[]>([]);
  const [explorerSubtreeTruncated, setExplorerSubtreeTruncated] = useState(false);
  const [explorerError, setExplorerError] = useState<string | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);
  const [explorerRootSort, setExplorerRootSort] = useState<{
    sortBy: FolderAggSortKey;
    sortDir: BrowseSortDir;
  }>({ sortBy: "files", sortDir: "desc" });
  const [explorerFileSort, setExplorerFileSort] = useState<{
    column: BrowseSortColumn;
    dir: BrowseSortDir;
  }>({ column: "name", dir: "asc" });

  const [visibleColumns, setVisibleColumns] = useState<InspectColumn[]>(() => defaultVisibleColumns());
  const [columnsPopoverOpen, setColumnsPopoverOpen] = useState(false);

  useEffect(() => {
    const read = readVisibleColumns();
    setVisibleColumns(read);
  }, []);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailOk | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailModalTab, setDetailModalTab] = useState<DetailModalTab>("overview");

  const [previewBlob, setPreviewBlob] = useState<
    | { kind: "image"; mimeType: string; url: string }
    | { kind: "text"; text: string }
    | null
  >(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewObjectUrlRef = useRef<string | null>(null);
  const browseRequestIdRef = useRef(0);
  const explorerRequestIdRef = useRef(0);

  const [sortColumn, setSortColumn] = useState<BrowseSortColumn>("mtime");
  const [sortDir, setSortDir] = useState<BrowseSortDir>("desc");
  const [rescanningPaths, setRescanningPaths] = useState<Set<string>>(new Set());

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (isAigeniusDesktopRuntime()) {
      setBridgePhase("ready");
      return;
    }
    const maxWaitMs =
      isLikelyElectronRenderer() || isDesktopShellFromBuild() ? 12_000 : 2_500;
    void waitForAigeniusDesktopBridge(maxWaitMs).then((ok) => {
      setBridgePhase(ok ? "ready" : "unavailable");
    });
  }, []);

  const closeDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setDetailModalTab("overview");
    setSelectedPath(null);
    setDetail(null);
    setDetailError(null);
    if (previewObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      } catch {
        /* ignore */
      }
      previewObjectUrlRef.current = null;
    }
    setPreviewBlob(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }, []);

  useEffect(() => {
    if (!detailModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDetailModal();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [detailModalOpen, closeDetailModal]);

  const toggleColumnVisible = useCallback((c: InspectColumn) => {
    if (c === "actions") return;
    setVisibleColumns((prev) => {
      const has = prev.includes(c);
      const next = has ? prev.filter((x) => x !== c) : [...prev, c];
      const ordered = ALL_COLUMNS.filter((id) => next.includes(id));
      writeVisibleColumns(ordered);
      return ordered;
    });
  }, []);

  const resetColumnsVisible = useCallback(() => {
    const d = defaultVisibleColumns();
    setVisibleColumns(d);
    writeVisibleColumns(d);
    setColumnsPopoverOpen(false);
  }, []);

  const loadList = useCallback(async (opts?: { forceOffset?: number }) => {
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    if (!bridgeRoot?.searchBrowse) {
      setListError("Search browse is not available in this build.");
      return;
    }
    const effectiveOffset = Math.max(opts?.forceOffset ?? offset, 0);
    const seq = browseRequestIdRef.current + 1;
    browseRequestIdRef.current = seq;
    setLoadingList(true);
    setListError(null);
    try {
      const res = await bridgeRoot.searchBrowse({
        limit: PAGE_LIMIT,
        offset: effectiveOffset,
        pathContains: debouncedPath.trim() || undefined,
        contentContains: debouncedContent.trim() || undefined,
        extension: debouncedExt.trim().replace(/^\./, "").trim().toLowerCase() || undefined,
        previewChars: PREVIEW_HEAD_CHARS,
        previewTailChars: PREVIEW_TAIL_CHARS,
        sortColumn,
        sortDir,
      });
      if (browseRequestIdRef.current !== seq) return;
      if (res.error === true) {
        setListError("Request failed (is the desktop sidecar running?).");
        setRows([]);
        setTotal(0);
        return;
      }
      const nextRows = Array.isArray(res.rows) ? res.rows : [];
      const nextTotal =
        typeof res.total === "number" && Number.isFinite(res.total) ? res.total : nextRows.length;
      setRows(nextRows as BrowseRow[]);
      setTotal(nextTotal);
    } catch {
      if (browseRequestIdRef.current !== seq) return;
      setListError("Could not load index.");
      setRows([]);
      setTotal(0);
    } finally {
      if (browseRequestIdRef.current === seq) {
        setLoadingList(false);
      }
    }
  }, [debouncedContent, debouncedExt, debouncedPath, offset, sortColumn, sortDir]);

  useEffect(() => {
    if (bridgePhase !== "ready" || viewMode !== "flat") return;
    if (total === 0) return;
    if (offset >= total) {
      setOffset(0);
    }
  }, [bridgePhase, offset, total, viewMode]);

  useEffect(() => {
    setExplorerFileOffset(0);
  }, [explorerPath]);


  const loadExplorer = useCallback(
    async (opts?: {
      forcePath?: string;
      forceRootOffset?: number;
      forceFileOffset?: number;
    }) => {
      const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
      if (!bridgeRoot?.searchExplorer) {
        setExplorerError("searchExplorer bridge is unavailable in this build.");
        setExplorerFolders([]);
        setExplorerFiles([]);
        setExplorerTotalRootFolders(0);
        setExplorerTotalFilesHere(0);
        setExplorerSubtreeTruncated(false);
        return;
      }
      const forcedPathRaw = opts?.forcePath;
      const effectivePath = (forcedPathRaw ?? explorerPath).trim();
      const inRoot = effectivePath.length === 0;
      const effectiveRootOffset = Math.max(opts?.forceRootOffset ?? explorerRootOffset, 0);
      const effectiveFileOffset = Math.max(opts?.forceFileOffset ?? explorerFileOffset, 0);
      const seq = explorerRequestIdRef.current + 1;
      explorerRequestIdRef.current = seq;
      setExplorerLoading(true);
      setExplorerError(null);
      try {
        const res = await bridgeRoot.searchExplorer({
          directoryPath: effectivePath || undefined,
          rootOffset: inRoot ? effectiveRootOffset : 0,
          rootLimit: FOLDER_PAGE_LIMIT,
          fileOffset: inRoot ? 0 : effectiveFileOffset,
          fileLimit: PAGE_LIMIT,
          pathContains: debouncedPath.trim() || undefined,
          contentContains: debouncedContent.trim() || undefined,
          extension: debouncedExt.trim().replace(/^\./, "").trim().toLowerCase() || undefined,
          rootSortBy:
            explorerRootSort.sortBy === "files"
              ? "files"
              : explorerRootSort.sortBy === "recent"
                ? "recent"
                : "folder",
          rootSortDir: explorerRootSort.sortDir,
          fileSortColumn: explorerFileSort.column,
          fileSortDir: explorerFileSort.dir,
          previewChars: PREVIEW_HEAD_CHARS,
          previewTailChars: PREVIEW_TAIL_CHARS,
        });
        if (explorerRequestIdRef.current !== seq) return;
        if (!res || typeof res !== "object") {
          setExplorerError("Invalid response from desktop.");
          setExplorerFolders([]);
          setExplorerFiles([]);
          setExplorerTotalRootFolders(0);
          setExplorerTotalFilesHere(0);
          setExplorerSubtreeTruncated(false);
          return;
        }
        if (
          res.error === true ||
          (typeof res.error === "string" && res.error.length > 0)
        ) {
          const errMsg =
            typeof res.error === "string" && res.error.length > 0
              ? res.error
              : "Sidecar rejected the explorer request.";
          setExplorerError(errMsg);
          setExplorerFolders([]);
          setExplorerFiles([]);
          setExplorerTotalRootFolders(0);
          setExplorerTotalFilesHere(0);
          setExplorerSubtreeTruncated(false);
          return;
        }
        const modeOk = res.mode === "dir" ? "dir" : "root";
        setExplorerMode(modeOk);
        const folderList = Array.isArray(res.folders) ? res.folders : [];
        setExplorerFolders(folderList as ExplorerFolderRow[]);
        const browsable = Array.isArray(res.files) ? (res.files as BrowseRow[]) : [];
        setExplorerFiles(browsable);
        setExplorerTotalRootFolders(
          typeof res.totalRootFolders === "number" ? res.totalRootFolders : 0,
        );
        setExplorerTotalFilesHere(
          typeof res.totalFilesInDirectory === "number" ? res.totalFilesInDirectory : 0,
        );
        setExplorerParent(typeof res.parentDirectory === "string" ? res.parentDirectory : null);
        setExplorerBreadcrumbs(Array.isArray(res.breadcrumbPrefixes) ? res.breadcrumbPrefixes : []);
        setExplorerSubtreeTruncated(Boolean(res.subtreeScanTruncated));
      } catch (err) {
        if (explorerRequestIdRef.current !== seq) return;
        const fallback =
          err instanceof Error &&
            (/no handler|ERR_INVALID_ARGUMENT|search:explorer/i.test(err.message || "") ||
              err.message.toLowerCase().includes("could not invoke"))
            ? "Explorer requires a matching Electron main and sidecar. Run `npm run compile` in the desktop package, `npm run build` in desktop-server, and restart."
            : `Could not load explorer.${err instanceof Error ? ` (${err.message})` : ""}`;
        setExplorerError(fallback);
        setExplorerFolders([]);
        setExplorerFiles([]);
        setExplorerTotalRootFolders(0);
        setExplorerTotalFilesHere(0);
        setExplorerSubtreeTruncated(false);
      } finally {
        if (explorerRequestIdRef.current === seq) {
          setExplorerLoading(false);
        }
      }
    }, [
    debouncedContent,
    debouncedExt,
    debouncedPath,
    explorerFileOffset,
    explorerFileSort.column,
    explorerFileSort.dir,
    explorerPath,
    explorerRootOffset,
    explorerRootSort.sortBy,
    explorerRootSort.sortDir,
  ]);

  useEffect(() => {
    if (bridgePhase !== "ready") return;
    if (viewMode === "flat") {
      void loadList();
    } else {
      void loadExplorer();
    }
  }, [bridgePhase, loadList, loadExplorer, viewMode, offset, explorerRootOffset, explorerFileOffset]);


  useEffect(() => {
    if (bridgePhase !== "ready" || viewMode !== "explorer") return;
    if (explorerMode !== "dir") return;
    if (explorerTotalFilesHere === 0) return;
    if (explorerFileOffset >= explorerTotalFilesHere) {
      setExplorerFileOffset(0);
    }
  }, [
    bridgePhase,
    explorerFileOffset,
    explorerMode,
    explorerTotalFilesHere,
    viewMode,
  ]);

  useEffect(() => {
    if (bridgePhase !== "ready" || viewMode !== "explorer") return;
    if (explorerMode !== "root") return;
    if (explorerTotalRootFolders === 0) return;
    if (explorerRootOffset >= explorerTotalRootFolders) {
      setExplorerRootOffset(0);
    }
  }, [
    bridgePhase,
    explorerMode,
    explorerRootOffset,
    explorerTotalRootFolders,
    viewMode,
  ]);

  const loadDetail = useCallback(async (filePath: string) => {
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    if (!bridgeRoot?.searchRow) return;
    setLoadingDetail(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await bridgeRoot.searchRow(filePath);
      if (res && "error" in res && typeof res.error === "string") {
        setDetailError(res.error);
        return;
      }
      if (res && "content" in res) {
        console.log("[search-index] detail loaded:", res);
        setDetail(res as DetailOk);
        return;
      }
      setDetailError("Unexpected response.");
    } catch {
      setDetailError("Could not load row.");
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const rescanPath = useCallback(async (filePath: string) => {
    console.log("[search-index] scan for: ", filePath);
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    if (!bridgeRoot?.searchReindex) return;

    setRescanningPaths(prev => new Set(prev).add(filePath));
    try {
      await bridgeRoot.searchReindex({ paths: [filePath], force: true });
      // Give it a moment to index, then reload
      setTimeout(() => {
        console.log("[search-index] rescan complete, refreshing UI for:", filePath);
        setRescanningPaths(prev => {
          const next = new Set(prev);
          next.delete(filePath);
          return next;
        });
        if (viewMode === "flat") {
          void loadList();
        } else {
          void loadExplorer();
        }
        // If modal is open for this path, reload detail too
        if (detailModalOpen && selectedPath === filePath) {
          void loadDetail(filePath);
        }
      }, 1200);
    } catch (err) {
      console.error("Rescan failed", err);
      setRescanningPaths(prev => {
        const next = new Set(prev);
        next.delete(filePath);
        return next;
      });
    }
  }, [loadList, loadExplorer, viewMode, detailModalOpen, selectedPath, loadDetail]);

  const loadDiskPreviewForPath = useCallback(async (filePath: string | null, tab: DetailModalTab) => {
    if (!filePath || tab !== "preview") return;
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    const reader = bridgeRoot?.readLocalFilePreview;
    if (typeof reader !== "function") {
      setPreviewError("This build cannot read local files for preview.");
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    if (previewObjectUrlRef.current) {
      try {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      } catch {
        /* ignore */
      }
      previewObjectUrlRef.current = null;
    }
    setPreviewBlob(null);
    try {
      const res = await reader(filePath);
      if (!res || res.ok !== true) {
        const err = !res ? "preview_failed" : res.error === "unsupported_type"
          ? "No built-in preview for this file type."
          : res.error === "too_large"
            ? "File is too large for the security cap."
            : res.error ?? "preview_failed";
        setPreviewError(err);
        return;
      }
      if (res.kind === "image") {
        const blob = Uint8Array.from(atob(res.base64), (cc) => cc.charCodeAt(0));
        const b = new Blob([blob], { type: res.mimeType });
        const url = URL.createObjectURL(b);
        previewObjectUrlRef.current = url;
        setPreviewBlob({ kind: "image", mimeType: res.mimeType, url });
      } else {
        setPreviewBlob({ kind: "text", text: res.text });
      }
    } catch {
      setPreviewError("Preview failed unexpectedly.");
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!detailModalOpen || detailModalTab !== "preview") return;
    if (!selectedPath) return;
    void loadDiskPreviewForPath(selectedPath, "preview");
  }, [detailModalOpen, detailModalTab, selectedPath, loadDiskPreviewForPath]);

  useEffect(() => {
    if (!detailModalOpen || !selectedPath) return;
    if (detailModalTab !== "overview") return;
    if (loadingDetail) return;
    if (detail?.path === selectedPath) return;
    void loadDetail(selectedPath);
  }, [detailModalOpen, detailModalTab, selectedPath, detail?.path, loadingDetail, loadDetail]);

  const openDetailModalForPath = useCallback(
    (filePath: string, initialTab: DetailModalTab = "overview") => {
      setSelectedPath(filePath);
      setDetailModalOpen(true);
      setDetailModalTab(initialTab);
      setDetail(null);
      setDetailError(null);
      if (initialTab === "preview") {
        void loadDiskPreviewForPath(filePath, "preview");
      }
    },
    [loadDiskPreviewForPath],
  );

  const openInOs = useCallback(async (filePath: string) => {
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    const fn = bridgeRoot?.openFile;
    if (typeof fn !== "function") return;
    await fn(filePath);
  }, []);

  const revealInOs = useCallback(async (filePath: string) => {
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    const fn = bridgeRoot?.revealFileInFolder;
    if (typeof fn !== "function") return;
    await fn(filePath);
  }, []);

  const onSortColumnClick = useCallback((column: BrowseSortColumn) => {
    setSortColumn((prevCol) => {
      if (prevCol === column) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prevCol;
      }
      setSortDir(sortDirBootstrap(column));
      return column;
    });
    setOffset(0);
    setExplorerFileOffset(0);
  }, []);

  const onSortExplorerRootClick = useCallback((key: FolderAggSortKey) => {
    setExplorerRootSort((prev) => {
      if (prev.sortBy === key) {
        return { sortBy: key, sortDir: prev.sortDir === "asc" ? "desc" : "asc" };
      }
      return { sortBy: key, sortDir: key === "folder" ? "asc" : "desc" };
    });
    setExplorerRootOffset(0);
  }, []);

  const onSortExplorerFileColumnClick = useCallback((column: BrowseSortColumn) => {
    setExplorerFileSort((prev) => {
      if (prev.column === column) {
        return { column, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { column, dir: sortDirBootstrap(column) };
    });
    setExplorerFileOffset(0);
  }, []);

  const bridge = bridgePhase === "ready" ? getAigeniusDesktopBridgeFromBrowsingContext() : undefined;
  const canBrowse = Boolean(bridge?.searchBrowse);
  const canExplorer = typeof bridge?.searchExplorer === "function";
  const layoutReady = bridgePhase === "ready" && canBrowse;

  const detailJsonPretty = useMemo(() => {
    if (!detail) return "";
    try {
      return JSON.stringify(indexedFileRowToJson(detail), null, 2);
    } catch {
      return "{}";
    }
  }, [detail]);

  const copyDetailJson = useCallback(async () => {
    if (!detailJsonPretty || typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      return;
    }
    try {
      await navigator.clipboard.writeText(detailJsonPretty);
    } catch {
      /* ignore */
    }
  }, [detailJsonPretty]);

  const modalHost =
    typeof document !== "undefined" ? (document.getElementById("modal-root") ?? document.body) : null;

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

  function renderBrowseRowCells(r: BrowseRow): JSX.Element[] {
    const out: JSX.Element[] = [];

    const head = r.contentHead ?? r.contentPreview;
    const tail = r.contentTail ?? "";

    const openStop = (
      <>
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
              rescanningPaths.has(r.path) && "animate-pulse cursor-wait opacity-70"
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
      </>
    );

    const cellClass = {
      sticky:
        cn(
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
  }

  const detailModal =
    portalMounted &&
    detailModalOpen &&
    modalHost &&
    createPortal(
      <div
        role="presentation"
        className="fixed inset-0 z-[260] flex items-center justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:p-5"
        onClick={closeDetailModal}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="search-index-detail-title"
          className={cn(
            "flex max-h-[min(92vh,940px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-600/90",
            "bg-[#161618] shadow-[0_28px_80px_-24px_rgba(0,0,0,0.85)]",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-700/90 px-4 py-3 sm:px-5 sm:py-4">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                Indexed file
              </p>
              <h2
                id="search-index-detail-title"
                className="mt-0.5 truncate text-base font-semibold text-zinc-50 sm:text-lg"
              >
                {detail?.name ?? loadingDetail ? "Loading…" : selectedPath?.split(/[/\\]/).pop() ?? "Detail"}
              </h2>
              <p className="mt-1 font-mono text-[11px] leading-snug text-zinc-400 break-all sm:text-xs">{selectedPath ?? "—"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {selectedPath ? (
                <>
                  <button
                    type="button"
                    disabled={rescanningPaths.has(selectedPath)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-amber-900/60 bg-amber-950/20 px-2.5 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-950/40",
                      rescanningPaths.has(selectedPath) && "animate-pulse cursor-wait opacity-70"
                    )}
                    onClick={() => void rescanPath(selectedPath)}
                  >
                    <FiRotateCcw className={cn("h-3.5 w-3.5", rescanningPaths.has(selectedPath) && "animate-spin")} />
                    {rescanningPaths.has(selectedPath) ? "Scanning..." : "Rescan"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
                    onClick={() => void openInOs(selectedPath)}
                    title="Open with default OS application"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-600 bg-zinc-800/70 px-2.5 py-1.5 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700"
                    onClick={() => void revealInOs(selectedPath)}
                  >
                    Reveal
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-emerald-900/65 bg-emerald-950/30 px-2.5 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-950/48"
                    onClick={() => {
                      setDetailModalTab("preview");
                      void loadDiskPreviewForPath(selectedPath, "preview");
                    }}
                  >
                    Preview file
                  </button>
                </>
              ) : null}
              <button
                type="button"
                aria-label="Close detail"
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-700/70 hover:text-zinc-100"
                onClick={closeDetailModal}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="shrink-0 border-b border-zinc-700/70 px-3 pt-3 sm:px-5">
            <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-900/80 p-1">
              {(
                [
                  ["overview", "Overview"],
                  ["preview", "Disk preview"],
                  ["json", "Raw JSON"],
                ] as const
              ).map(([id, lab]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-medium transition sm:text-sm",
                    detailModalTab === id ? "bg-zinc-700 text-zinc-50 shadow-sm" : "text-zinc-400 hover:text-zinc-200",
                  )}
                  onClick={() => setDetailModalTab(id)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
            {detailModalTab === "preview" ? (
              <div className="flex min-h-[12rem] flex-col gap-3">
                {previewLoading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-24 rounded-lg bg-zinc-700/65" />
                    <div className="h-4 w-11/12 rounded bg-zinc-700/55" />
                  </div>
                ) : previewError ? (
                  <p className="text-sm font-medium text-amber-200">{previewError}</p>
                ) : previewBlob?.kind === "image" ? (
                  <figure className="mx-auto flex max-h-[72vh] max-w-full flex-col gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL from local preview IPC */}
                    <img
                      src={previewBlob.url}
                      alt="Local file preview"
                      className="max-h-[62vh] w-auto max-w-full rounded-xl border border-zinc-700/80 bg-black object-contain"
                    />
                    <figcaption className="font-mono text-[11px] text-zinc-500">{previewBlob.mimeType}</figcaption>
                  </figure>
                ) : previewBlob?.kind === "text" ? (
                  <pre
                    className={cn(
                      "max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-zinc-700/80",
                      "bg-[#0d0d0f] px-4 py-3 font-mono text-xs text-zinc-200",
                    )}
                  >
                    {previewBlob.text}
                  </pre>
                ) : (
                  <p className="text-sm text-zinc-500">No preview loaded.</p>
                )}
              </div>
            ) : loadingDetail && detailModalTab === "overview" ? (
              <div className="flex flex-col gap-3">
                <div className="h-4 animate-pulse rounded bg-zinc-700/70" />
                <div className="h-4 w-[92%] animate-pulse rounded bg-zinc-700/50" />
                <div className="h-32 animate-pulse rounded-lg bg-zinc-800/60" />
              </div>
            ) : detailError ? (
              <p className="text-sm font-medium text-red-300">{detailError}</p>
            ) : detail ? (
              <>
                {detail.contentTruncated ? (
                  <p className="mb-4 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-100/95">
                    <span className="font-semibold text-amber-50">Truncated:</span> the server returned a capped slice of{" "}
                    <code className="text-amber-200">content</code>. The database may hold more until you adjust the backend limit.
                  </p>
                ) : null}

                {detailModalTab === "overview" ? (
                  <div className="flex flex-col gap-6">
                    <dl className="grid grid-cols-[minmax(6rem,9rem)_1fr] gap-x-4 gap-y-2.5 text-sm sm:gap-y-3">
                      <dt className="font-medium text-zinc-500">Extension</dt>
                      <dd className="break-all font-mono text-zinc-100">{detail.extension || "—"}</dd>
                      <dt className="font-medium text-zinc-500">Modified</dt>
                      <dd className="text-zinc-100">
                        {new Date(detail.mtime).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
                        <span className="mt-0.5 block font-mono text-[11px] text-zinc-500">mtime_ms={detail.mtime}</span>
                      </dd>
                      <dt className="font-medium text-zinc-500">Tags</dt>
                      <dd className="break-all text-zinc-200">{detail.tags || "—"}</dd>
                      <dt className="font-medium text-zinc-500">Approx. content length</dt>
                      <dd className="font-mono text-zinc-100">{detail.content.length} chars (JS)</dd>
                    </dl>

                    <div>
                      <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">
                        Stored extracted content
                      </h3>
                      <div
                        tabIndex={0}
                        className={cn(
                          "max-h-[min(52vh,480px)] overflow-auto rounded-xl border border-zinc-700/80",
                          "bg-[#0d0d0f] px-4 py-3 shadow-inner sm:px-5 sm:py-4",
                          "text-sm leading-relaxed text-zinc-200 [tab-size:2]",
                        )}
                      >
                        <pre className="break-words font-sans whitespace-pre-wrap">{detail.content || "(empty)"}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="rounded-lg border border-emerald-800/70 bg-emerald-950/30 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-950/50"
                        onClick={() => void copyDetailJson()}
                      >
                        Copy JSON
                      </button>
                    </div>
                    <pre
                      tabIndex={0}
                      className={cn(
                        "max-h-[min(62vh,560px)] min-h-[12rem] overflow-auto rounded-xl border border-zinc-700/80",
                        "bg-[#0a0a0c] p-4 font-mono text-[11px] leading-snug text-zinc-200 sm:p-5 sm:text-xs",
                      )}
                    >
                      {detailJsonPretty}
                    </pre>
                  </div>
                )}
              </>
            ) : detailModalTab === "overview" ? (
              <p className="text-sm text-zinc-500">No detail loaded.</p>
            ) : null}
          </div>
        </div>
      </div>,
      modalHost,
    );

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

            {bridgePhase === "pending" ? (
              <p className="text-sm text-zinc-400">Connecting to desktop shell…</p>
            ) : bridgePhase === "unavailable" ? (
              <div className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900/50 p-4 text-sm text-zinc-300">
                <p className="font-medium text-zinc-100">No desktop bridge found (nothing will load here).</p>
                <p>
                  This page talks to SQLite through the Electron preload (
                  <code className="text-amber-200/90">window.aigeniusDesktop</code>
                  ). Use the <strong className="text-zinc-100">AIGenius desktop app</strong>, not Chrome.
                </p>
              </div>
            ) : !canBrowse ? (
              <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-100">
                This build does not expose <code className="mx-1 text-amber-50">searchBrowse</code>.
              </div>
            ) : (
              <>
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
                          onClick={() => {
                            setViewMode(id);

                            setOffset(0);
                            setExplorerRootOffset(0);
                            setExplorerFileOffset(0);
                            setExplorerPath("");
                          }}
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
                    onClick={() => {
                      if (viewMode === "flat") {
                        setOffset(0);
                        void loadList({ forceOffset: 0 });
                      } else {
                        setExplorerRootOffset(0);
                        setExplorerFileOffset(0);
                        void loadExplorer({
                          forceRootOffset: 0,
                          forceFileOffset: 0,
                        });
                      }
                    }}
                  >
                    {loadingList || explorerLoading ? "Loading…" : "Apply"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    onClick={() => {
                      setPathContains("");
                      setContentContains("");
                      setExtension("");
                      setSortColumn("mtime");
                      setSortDir("desc");
                      setOffset(0);
                      setExplorerRootOffset(0);
                      setExplorerFileOffset(0);
                      setExplorerPath("");
                      setExplorerRootSort({ sortBy: "files", sortDir: "desc" });
                      setExplorerFileSort({ column: "name", dir: "asc" });
                    }}
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
            )}
          </div>

          {layoutReady ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-700/70 bg-[#101012]/80 pb-px shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]">
              {viewMode === "explorer" ? (
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800/95 bg-[#1b1c1f]/98 px-2 py-2 sm:gap-3 sm:px-3">
                  <button
                    type="button"
                    disabled={explorerPath.trim().length === 0 || explorerLoading}
                    className="rounded border border-zinc-600 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-200 hover:bg-zinc-800 disabled:opacity-35"
                    title={explorerParent == null ? "Already at top" : "Open parent folder"}
                    onClick={() => {
                      if (explorerPath.trim().length === 0) return;
                      setExplorerFileOffset(0);
                      setExplorerPath(explorerParent ?? "");
                    }}
                  >
                    Up
                  </button>
                  <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[11px] text-zinc-400" aria-label="Path">
                    <button
                      type="button"
                      className={cn(
                        "max-w-[10rem] truncate rounded px-1 py-0.5 font-semibold hover:bg-zinc-800/70 hover:text-zinc-100 sm:max-w-xs",
                        explorerPath.trim().length === 0 ? "text-zinc-100" : "text-zinc-400",
                      )}
                      onClick={() => {
                        setExplorerFileOffset(0);
                        setExplorerRootOffset(0);
                        setExplorerPath("");
                      }}
                    >
                      All indexed folders
                    </button>
                    {explorerBreadcrumbs.map((prefix) => (
                      <Fragment key={prefix}>
                        <span className="text-zinc-600" aria-hidden>
                          ›
                        </span>
                        <button
                          type="button"
                          className="max-w-[14rem] truncate rounded px-1 py-0.5 hover:bg-zinc-800/70 hover:text-zinc-100"
                          title={prefix}
                          onClick={() => {
                            setExplorerFileOffset(0);
                            setExplorerPath(prefix);
                          }}
                        >
                          {segmentExplorerLabel(prefix)}
                        </button>
                      </Fragment>
                    ))}
                  </nav>
                  {explorerMode === "dir" ? (
                    <p className="hidden max-w-xl truncate font-mono text-[10px] text-zinc-600 md:block" title={explorerPath}>
                      {explorerPath}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch] bg-[#0c0d0f]"
              >
                {viewMode === "explorer" ? (
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
                                {explorerRootSort.sortBy === "folder" ? folderSortGlyph(explorerRootSort.sortDir) : null}
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
                                {explorerRootSort.sortBy === "recent" ? folderSortGlyph(explorerRootSort.sortDir) : null}
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
                                {explorerRootSort.sortBy === "files" ? folderSortGlyph(explorerRootSort.sortDir) : null}
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
                ) : (
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
                )}
                {(viewMode === "flat"
                  ? rows.length === 0 && !loadingList
                  : explorerFolders.length + explorerFiles.length === 0 && !explorerLoading) ? (
                  <p className="p-8 text-center text-sm text-zinc-500">No matching records.</p>
                ) : null}
              </div>
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
            </div>
          ) : null}
        </div>
      </div>
      {detailModal}
    </>
  );
}

/** Last path segment for breadcrumb pills (browser-safe; no Node `path`). */
function segmentExplorerLabel(absPath: string): string {
  const trimmed = absPath.trim();
  if (!trimmed) return absPath;
  const parts = trimmed.split(/[/\\]/).filter((p) => p.length > 0);
  if (parts.length === 0) return trimmed;
  return parts[parts.length - 1] ?? trimmed;
}

function browseFolderAggAria(active: FolderAggSortKey, dir: BrowseSortDir, column: FolderAggSortKey): "none" | "ascending" | "descending" {
  if (active !== column) return "none";
  return dir === "asc" ? "ascending" : "descending";
}

function folderSortGlyph(dir: BrowseSortDir): JSX.Element {
  return (
    <span aria-hidden className="ml-0.5 font-normal tabular-nums text-zinc-500">
      {dir === "asc" ? " ↑" : " ↓"}
    </span>
  );
}
