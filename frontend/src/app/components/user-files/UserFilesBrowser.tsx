"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";
import { RefreshCw, Search } from "lucide-react";
import { FiX } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import {
  buildCloudFileDisplayName,
  filterCloudFilesByQuery,
  formatFileByteSize,
  groupCloudFilesByCategory,
  isAttachableCloudFile,
  sortCloudFilesNewestFirst,
  USER_FILE_CATEGORY_LABELS,
  USER_FILE_CATEGORY_ORDER,
} from "./user-files.utils";
import { useUploadedFilesList } from "./useUploadedFilesList";
import {
  EmptyLibraryState,
  GalleryTile,
  LibraryFileList,
  ListRow,
  MoreOptionsMenu,
  TypeTagBar,
  type NavFilter,
  type UserFilesBrowserProps,
  type ViewMode,
} from "./components";
import { ImagePreviewLightbox } from "@/app/components/model-interface/features/message-types/components/ImagePreviewLightbox";

export type {
  UserFilesBrowserMode,
  UserFilesBrowserProps,
  UserFilesBrowserVariant,
} from "./components";
import { useLanguage } from "@/lib/providers/LanguageProvider";

export function UserFilesBrowser({
  variant,
  mode = "browse",
  onRequestClose,
  library: libraryProp,
  isMobileLayout = false,
  maxPickCount = 10,
  onConfirmPick,
}: UserFilesBrowserProps) {
  const { t } = useLanguage();
  const isPickMode = mode === "pick";
  const isModal = variant === "modal";
  const internalLibrary = useUploadedFilesList({ skip: !!libraryProp });
  const lib = libraryProp ?? internalLibrary;
  const { files, loading, isRefreshing, fetchError, refresh } = lib;

  const [query, setQuery] = useState("");
  const [navFilter, setNavFilter] = useState<NavFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(isModal ? "list" : "gallery");
  const [lightboxFile, setLightboxFile] = useState<CloudFile | null>(null);
  const [selectedPickIds, setSelectedPickIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => {
      const base = filterCloudFilesByQuery(files, query);
      return isPickMode ? base.filter(isAttachableCloudFile) : base;
    },
    [files, query, isPickMode],
  );

  const togglePickSelection = useCallback((file: CloudFile) => {
    setSelectedPickIds((prev) => {
      const next = new Set(prev);
      if (next.has(file.id)) {
        next.delete(file.id);
        return next;
      }
      if (next.size >= maxPickCount) {
        toast.error(`You can attach up to ${maxPickCount} files at once.`);
        return prev;
      }
      next.add(file.id);
      return next;
    });
  }, [maxPickCount]);

  const selectedPickFiles = useMemo(
    () => files.filter((file) => selectedPickIds.has(file.id)),
    [files, selectedPickIds],
  );

  const handleConfirmPick = useCallback(() => {
    if (!onConfirmPick || selectedPickFiles.length === 0) return;
    onConfirmPick(selectedPickFiles);
    setSelectedPickIds(new Set());
  }, [onConfirmPick, selectedPickFiles]);

  const grouped = useMemo(
    () => groupCloudFilesByCategory(filtered),
    [filtered],
  );

  const gridFiles = useMemo(() => {
    const slice =
      navFilter === "all" ? filtered : grouped[navFilter];
    return sortCloudFilesNewestFirst(slice);
  }, [navFilter, filtered, grouped]);

  const totalBytes = useMemo(
    () => filtered.reduce((sum, f) => sum + (f.fileSizeInBytes ?? 0), 0),
    [filtered],
  );

  const handleCopy = useCallback((file: CloudFile) => {
    const ok = copy(file.s3Link);
    if (ok) {
      toast.success(`Copied: ${buildCloudFileDisplayName(file)}`);
    } else {
      toast.error("Could not copy link");
    }
  }, []);

  useEffect(() => {
    if (!lightboxFile) return;
    document.body.dataset.myfilesLightbox = "1";
    return () => {
      delete document.body.dataset.myfilesLightbox;
    };
  }, [lightboxFile]);

  if (loading && files.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 py-20"
        role="status"
        aria-live="polite"
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-[3px] border-cyan-100 border-t-cyan-600 motion-reduce:animate-none"
          aria-hidden
        />
        <p className="text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  if (fetchError && files.length === 0) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-5 text-center">
        <p className="text-sm font-medium text-red-800" role="alert">
          {fetchError}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="mt-3 text-sm font-semibold text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const alertsBlock = (
    <>
      {fetchError && files.length > 0 ? (
        <p
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {fetchError}{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void refresh()}
          >
            Retry
          </button>
        </p>
      ) : null}

      {isRefreshing ? (
        <div
          className="mb-2 h-0.5 w-full rounded-full bg-cyan-100 motion-safe:animate-pulse"
          role="status"
          aria-live="polite"
          aria-label="Updating files"
        >
          <div className="h-full w-full rounded-full bg-cyan-500/80" />
        </div>
      ) : null}
    </>
  );

  const statsLine = (
    <p
      className={
        isModal
          ? "mb-3 text-[11px] text-gray-500 tabular-nums"
          : "mt-2 text-xs text-gray-500 tabular-nums"
      }
    >
      {gridFiles.length} items · {formatFileByteSize(totalBytes)}
    </p>
  );

  const fileGridOrList = (
    <>
      {gridFiles.length === 0 ? (
        files.length === 0 ? (
          <EmptyLibraryState
            variant={variant}
            onRequestClose={onRequestClose}
          />
        ) : (
          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 py-16 text-center text-sm text-gray-500">
            Nothing matches this filter or search.
          </div>
        )
      ) : isModal ? (
        <LibraryFileList
          mode={isPickMode ? "pick" : "browse"}
          files={gridFiles}
          selectedIds={selectedPickIds}
          onToggleSelect={togglePickSelection}
          onCopy={handleCopy}
          onImageClick={setLightboxFile}
          onRequestClose={onRequestClose}
        />
      ) : viewMode === "gallery" ? (
        <div
          className={
            isModal
              ? `grid ${isMobileLayout ? "grid-cols-1 gap-2" : "grid-cols-1 md:grid-cols-3 gap-3"}`
              : "mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
          }
        >
          {gridFiles.map((file) => (
            <GalleryTile
              key={file.id}
              compact={isModal}
              isMobileLayout={isModal ? isMobileLayout : false}
              file={file}
              onCopy={handleCopy}
              onImageClick={setLightboxFile}
              onRequestClose={onRequestClose}
              pickMode={isPickMode}
              selected={selectedPickIds.has(file.id)}
              onToggleSelect={() => togglePickSelection(file)}
            />
          ))}
        </div>
      ) : (
        <ul className="mt-5 space-y-3" role="list">
          {gridFiles.map((file) => (
            <ListRow
              key={file.id}
              file={file}
              onCopy={handleCopy}
              onImageClick={setLightboxFile}
              onRequestClose={onRequestClose}
              pickMode={isPickMode}
              selected={selectedPickIds.has(file.id)}
              onToggleSelect={() => togglePickSelection(file)}
            />
          ))}
        </ul>
      )}
    </>
  );

  const explorerInnerPage = (
    <>
      {alertsBlock}

      <TypeTagBar
        compact={false}
        modelPickerStyle={false}
        navFilter={navFilter}
        onNavFilter={setNavFilter}
        grouped={grouped}
        totalCount={filtered.length}
      />

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="user-files-search" className="sr-only">
            Search files
          </label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            id="user-files-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            aria-label="Search files"
            className="w-full rounded-full border border-gray-300 bg-white py-2 pl-10 pr-3 text-xs text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500 sm:text-sm"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MoreOptionsMenu
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onRefresh={() => void refresh()}
          />
        </div>
      </div>

      {statsLine}
      {fileGridOrList}
    </>
  );

  const pickToolbar = isPickMode ? (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2.5"
      style={{
        borderColor: "var(--modal-border)",
        background: "var(--modal-bg-muted)",
      }}
    >
      <button
        type="button"
        onClick={handleConfirmPick}
        disabled={selectedPickFiles.length === 0}
        className="app-modal-btn-primary px-3.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
      >
        Attach
      </button>
      <button
        type="button"
        onClick={() => setSelectedPickIds(new Set())}
        disabled={selectedPickFiles.length === 0}
        className="rounded-lg border px-3.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
        }}
      >
        Clear
      </button>
      <span
        className="text-xs tabular-nums"
        style={{ color: "var(--modal-muted-fg)" }}
      >
        {selectedPickFiles.length} selected
      </span>
    </div>
  ) : null;

  const categoryPills = (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
      <button
        type="button"
        onClick={() => setNavFilter("all")}
        className={`app-filter-pill flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium ${
          navFilter === "all" ? "app-filter-pill--active" : ""
        }`}
      >
        <span>All</span>
        <span className="tabular-nums text-[10px] opacity-75">
          ({filtered.length})
        </span>
      </button>
      {USER_FILE_CATEGORY_ORDER.map((cat) => {
        const count = grouped[cat]?.length ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => setNavFilter(cat)}
            className={`app-filter-pill flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium ${
              navFilter === cat ? "app-filter-pill--active" : ""
            }`}
          >
            <span>{USER_FILE_CATEGORY_LABELS[cat]}</span>
            <span className="tabular-nums text-[10px] opacity-75">
              ({count})
            </span>
          </button>
        );
      })}
    </div>
  );

  const explorerInnerModal = (
    <>
      <div
        className="border-b sticky top-0 z-10 flex flex-col gap-2.5 px-4 py-3"
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--modal-bg)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="user-files-modal-search" className="sr-only">
              Search files
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: "var(--modal-muted-fg)" }}
              aria-hidden
            />
            <input
              id="user-files-modal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              aria-label="Search files"
              className="app-modal-input h-9 pl-9 pr-8 text-xs sm:text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors hover:text-red-500"
                style={{ color: "var(--modal-muted-fg)" }}
                title="Clear search"
                aria-label="Clear search"
              >
                <FiX size={14} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none"
            style={{
              borderColor: "var(--modal-border)",
              background: "var(--surface-muted)",
              color: "var(--modal-muted-fg)",
            }}
            title="Refresh"
            aria-label="Refresh files"
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform ${isRefreshing ? "animate-spin text-[var(--chat-accent)]" : ""}`}
              aria-hidden
            />
          </button>
        </div>

        {categoryPills}
      </div>

      {pickToolbar}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain workflow-scroll ${
            isMobileLayout ? "p-0 pb-4" : "p-0 pb-4"
          }`}
        >
          {alertsBlock}
          {fileGridOrList}
        </div>
      </div>
    </>
  );

  const explorerInner = isModal ? explorerInnerModal : explorerInnerPage;

  const lightbox =
    lightboxFile && (
      <ImagePreviewLightbox
        imageUrl={{
          fileUrl: lightboxFile.s3Link,
          fileName: buildCloudFileDisplayName(lightboxFile),
          kind: "image",
        }}
        onClose={() => setLightboxFile(null)}
        onSavedToUploads={() => {
          void refresh({ silent: true });
        }}
      />
    );

  if (isModal) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {explorerInner}
        {!isPickMode ? lightbox : null}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3 sm:px-5">
        <h2 className="text-base font-bold text-gray-900">{t('userFiles.browserTitle', 'Your files')}</h2>
        <p className="text-xs text-gray-500">
          Filter by type · gallery or list · copy or open each file
        </p>
      </div>
      <div className="flex min-h-0 flex-col p-4 sm:p-5">
        <div className="min-h-0 flex-1">{explorerInner}</div>
        {lightbox}
      </div>
    </section>
  );
}
