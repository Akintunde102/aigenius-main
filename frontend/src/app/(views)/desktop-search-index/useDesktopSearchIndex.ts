"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAigeniusDesktopBridgeFromBrowsingContext,
  isAigeniusDesktopRuntime,
  isDesktopShellFromBuild,
  isLikelyElectronRenderer,
  waitForAigeniusDesktopBridge,
} from "@/lib/utils/desktop-runtime";
import {
  FOLDER_PAGE_LIMIT,
  PAGE_LIMIT,
  PREVIEW_HEAD_CHARS,
  PREVIEW_TAIL_CHARS,
} from "./desktop-search-index.constants";
import {
  ALL_COLUMNS,
  defaultVisibleColumns,
  indexedFileRowToJson,
  readVisibleColumns,
  sortDirBootstrap,
  writeVisibleColumns,
} from "./desktop-search-index.utils";
import type {
  BrowseRow,
  BrowseSortColumn,
  BrowseSortDir,
  DetailModalTab,
  DetailOk,
  DesktopBridgePhase,
  ExplorerFolderRow,
  FolderAggSortKey,
  IndexerHealth,
  InspectColumn,
  InspectViewMode,
  PreviewBlob,
} from "./desktop-search-index.types";
import { useDebounce } from "./useDebounce";

export function useDesktopSearchIndex() {
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

  const [previewBlob, setPreviewBlob] = useState<PreviewBlob | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const previewObjectUrlRef = useRef<string | null>(null);
  const browseRequestIdRef = useRef(0);
  const explorerRequestIdRef = useRef(0);

  const [sortColumn, setSortColumn] = useState<BrowseSortColumn>("mtime");
  const [sortDir, setSortDir] = useState<BrowseSortDir>("desc");
  const [rescanningPaths, setRescanningPaths] = useState<Set<string>>(new Set());

  const [indexerHealth, setIndexerHealth] = useState<IndexerHealth | null>(null);
  const [ignoreOpen, setIgnoreOpen] = useState(false);
  const [ignoreContent, setIgnoreContent] = useState("");
  const [ignoreRoot, setIgnoreRoot] = useState<string | null>(null);
  const [ignoreSaving, setIgnoreSaving] = useState(false);

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

  useEffect(() => {
    if (bridgePhase !== "ready") return;
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    const poll = async () => {
      try {
        const st = await bridgeRoot?.searchStatus?.();
        if (st && typeof st === "object") {
          setIndexerHealth(st);
          if (typeof st.project_root === "string" && st.project_root) {
            setIgnoreRoot(st.project_root);
          }
        }
      } catch {
        /* ignore */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 12_000);
    return () => window.clearInterval(id);
  }, [bridgePhase]);

  useEffect(() => {
    if (!ignoreOpen || !ignoreRoot) return;
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    void bridgeRoot?.searchAigeniusIgnore?.({ rootPath: ignoreRoot }).then((res) => {
      if (res && !res.error && typeof res.content === "string") {
        setIgnoreContent(res.content);
      }
    });
  }, [ignoreOpen, ignoreRoot]);

  const saveAigeniusIgnore = useCallback(async () => {
    if (!ignoreRoot) return;
    const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
    if (!bridgeRoot?.searchAigeniusIgnoreSave) return;
    setIgnoreSaving(true);
    try {
      await bridgeRoot.searchAigeniusIgnoreSave({ rootPath: ignoreRoot, content: ignoreContent });
    } finally {
      setIgnoreSaving(false);
    }
  }, [ignoreContent, ignoreRoot]);

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
    },
    [
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
    ],
  );

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

  const rescanPath = useCallback(
    async (filePath: string) => {
      console.log("[search-index] scan for: ", filePath);
      const bridgeRoot = getAigeniusDesktopBridgeFromBrowsingContext();
      if (!bridgeRoot?.searchReindex) return;

      setRescanningPaths((prev) => new Set(prev).add(filePath));
      try {
        await bridgeRoot.searchReindex({ paths: [filePath], force: true });
        setTimeout(() => {
          console.log("[search-index] rescan complete, refreshing UI for:", filePath);
          setRescanningPaths((prev) => {
            const next = new Set(prev);
            next.delete(filePath);
            return next;
          });
          if (viewMode === "flat") {
            void loadList();
          } else {
            void loadExplorer();
          }
          if (detailModalOpen && selectedPath === filePath) {
            void loadDetail(filePath);
          }
        }, 1200);
      } catch (err) {
        console.error("Rescan failed", err);
        setRescanningPaths((prev) => {
          const next = new Set(prev);
          next.delete(filePath);
          return next;
        });
      }
    },
    [loadList, loadExplorer, viewMode, detailModalOpen, selectedPath, loadDetail],
  );

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
        const err = !res
          ? "preview_failed"
          : res.error === "unsupported_type"
            ? "No built-in preview for this file type."
            : res.error === "too_large"
              ? "File is too large for the security cap."
              : (res.error ?? "preview_failed");
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

  const resetFilters = useCallback(() => {
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
  }, []);

  const applyFilters = useCallback(() => {
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
  }, [viewMode, loadList, loadExplorer]);

  const switchViewMode = useCallback((id: InspectViewMode) => {
    setViewMode(id);
    setOffset(0);
    setExplorerRootOffset(0);
    setExplorerFileOffset(0);
    setExplorerPath("");
  }, []);

  return {
    bridgePhase,
    viewMode,
    pathContains,
    setPathContains,
    contentContains,
    setContentContains,
    extension,
    setExtension,
    scrollRef,
    offset,
    setOffset,
    rows,
    total,
    listError,
    loadingList,
    explorerPath,
    setExplorerPath,
    explorerRootOffset,
    setExplorerRootOffset,
    explorerFileOffset,
    setExplorerFileOffset,
    explorerFolders,
    explorerFiles,
    explorerMode,
    explorerTotalRootFolders,
    explorerTotalFilesHere,
    explorerParent,
    explorerBreadcrumbs,
    explorerSubtreeTruncated,
    explorerError,
    explorerLoading,
    explorerRootSort,
    explorerFileSort,
    visibleColumns,
    columnsPopoverOpen,
    setColumnsPopoverOpen,
    detailModalOpen,
    selectedPath,
    detail,
    detailError,
    loadingDetail,
    detailModalTab,
    setDetailModalTab,
    previewBlob,
    previewError,
    previewLoading,
    sortColumn,
    sortDir,
    rescanningPaths,
    indexerHealth,
    ignoreOpen,
    setIgnoreOpen,
    ignoreContent,
    setIgnoreContent,
    ignoreRoot,
    ignoreSaving,
    portalMounted,
    canBrowse,
    canExplorer,
    layoutReady,
    detailJsonPretty,
    closeDetailModal,
    toggleColumnVisible,
    resetColumnsVisible,
    loadList,
    loadExplorer,
    loadDiskPreviewForPath,
    openDetailModalForPath,
    openInOs,
    revealInOs,
    rescanPath,
    onSortColumnClick,
    onSortExplorerRootClick,
    onSortExplorerFileColumnClick,
    copyDetailJson,
    saveAigeniusIgnore,
    resetFilters,
    applyFilters,
    switchViewMode,
  };
}

export type DesktopSearchIndexState = ReturnType<typeof useDesktopSearchIndex>;
