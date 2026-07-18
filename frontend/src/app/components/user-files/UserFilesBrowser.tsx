"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import copy from "copy-to-clipboard";
import toast from "react-hot-toast";
import {
  Archive,
  Clapperboard,
  Code2,
  FileQuestion,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Presentation,
  RefreshCw,
  Rows3,
  Search,
  Table2,
  Check,
  X,
} from "lucide-react";
import { FiCopy, FiExternalLink, FiX } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import { timeAgo } from "@/lib/time-ago";
import { CATEGORY_THEME } from "./user-files.theme";
import {
  USER_FILE_CATEGORY_LABELS,
  USER_FILE_CATEGORY_ORDER,
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  filterCloudFilesByQuery,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
  groupCloudFilesByCategory,
  isAttachableCloudFile,
  isImageCloudFile,
  sortCloudFilesNewestFirst,
  type UserFileCategory,
} from "./user-files.utils";
import type { UploadedFilesLibraryState } from "./useUploadedFilesList";
import { useUploadedFilesList } from "./useUploadedFilesList";

export type UserFilesBrowserVariant = "page" | "modal";

export type UserFilesBrowserMode = "browse" | "pick";

export interface UserFilesBrowserProps {
  variant: UserFilesBrowserVariant;
  mode?: UserFilesBrowserMode;
  onRequestClose?: () => void;
  /** Shared state from a parent hook (e.g. sidebar preload) so the modal can open with warm cache. */
  library?: UploadedFilesLibraryState;
  /** When `variant="modal"`, align card layout with model modal (&lt;1024 = compact horizontal cards). */
  isMobileLayout?: boolean;
  maxPickCount?: number;
  onConfirmPick?: (files: CloudFile[]) => void;
}

type NavFilter = "all" | UserFileCategory;
type ViewMode = "gallery" | "list";

/** Left accent for non-image file tiles (strong type identity). */
const FILE_TYPE_LEFT_BORDER: Record<UserFileCategory, string> = {
  images: "border-l-emerald-500",
  documents: "border-l-sky-500",
  spreadsheets: "border-l-amber-500",
  presentations: "border-l-rose-500",
  code: "border-l-slate-600",
  archives: "border-l-orange-600",
  audio_video: "border-l-lime-600",
  other: "border-l-gray-500",
};

function categoryIcon(cat: UserFileCategory, size: "md" | "sm" | "lg" = "md") {
  const c =
    size === "lg" ? "h-14 w-14" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  switch (cat) {
    case "images":
      return <ImageIcon className={`${c} text-emerald-600`} strokeWidth={1.5} />;
    case "documents":
      return <FileText className={`${c} text-sky-600`} strokeWidth={1.5} />;
    case "spreadsheets":
      return <Table2 className={`${c} text-amber-600`} strokeWidth={1.5} />;
    case "presentations":
      return <Presentation className={`${c} text-rose-600`} strokeWidth={1.5} />;
    case "code":
      return <Code2 className={`${c} text-slate-600`} strokeWidth={1.5} />;
    case "archives":
      return <Archive className={`${c} text-orange-600`} strokeWidth={1.5} />;
    case "audio_video":
      return <Clapperboard className={`${c} text-lime-700`} strokeWidth={1.5} />;
    default:
      return <FileQuestion className={`${c} text-gray-600`} strokeWidth={1.5} />;
  }
}

export function UserFilesBrowser({
  variant,
  mode = "browse",
  onRequestClose,
  library: libraryProp,
  isMobileLayout = false,
  maxPickCount = 10,
  onConfirmPick,
}: UserFilesBrowserProps) {
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
      style={{ borderColor: "var(--modal-border, #e5e7eb)" }}
    >
      <button
        type="button"
        onClick={handleConfirmPick}
        disabled={selectedPickFiles.length === 0}
        className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
      >
        Attach
      </button>
      <button
        type="button"
        onClick={() => setSelectedPickIds(new Set())}
        disabled={selectedPickFiles.length === 0}
        className="rounded-lg border px-3.5 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5"
        style={{ borderColor: "var(--modal-border, #e5e7eb)" }}
      >
        Clear
      </button>
      <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
        {selectedPickFiles.length} selected
      </span>
    </div>
  ) : null;

  const explorerInnerModal = (
    <>
      <div
        className={`border-b border-gray-200 bg-white/70 sticky top-0 z-10 dark:border-gray-700 dark:bg-transparent ${isMobileLayout ? "px-2 py-1" : "px-4 py-1"
          }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="user-files-modal-search" className="sr-only">
              Search files
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              id="user-files-modal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files…"
              aria-label="Search files"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 placeholder-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-600 dark:bg-transparent dark:text-gray-100"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600"
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-white/5"
            title="Refresh"
            aria-label="Refresh files"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {pickToolbar}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] ${isMobileLayout ? "p-2 pb-4" : "px-2 pb-4 pt-1 sm:px-3"
            }`}
        >
          {alertsBlock}
          {fileGridOrList}
          <div className={isMobileLayout ? "h-3" : "h-6"} aria-hidden />
        </div>
      </div>
    </>
  );

  const explorerInner = isModal ? explorerInnerModal : explorerInnerPage;

  const lightbox =
    lightboxFile && (
      <ImageLightbox
        file={lightboxFile}
        onClose={() => setLightboxFile(null)}
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
        <h2 className="text-base font-bold text-gray-900">Your files</h2>
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

function TypeTagBar({
  compact,
  modelPickerStyle,
  navFilter,
  onNavFilter,
  grouped,
  totalCount,
}: {
  compact?: boolean;
  modelPickerStyle?: boolean;
  navFilter: NavFilter;
  onNavFilter: (n: NavFilter) => void;
  grouped: Record<UserFileCategory, CloudFile[]>;
  totalCount: number;
}) {
  return (
    <div
      className={
        modelPickerStyle
          ? "flex min-w-0 flex-1 flex-wrap items-center gap-2"
          : `flex flex-wrap border-b border-gray-200 ${compact ? "gap-1.5 pb-2" : "gap-2 pb-3"
          }`
      }
      role="tablist"
      aria-label="File type"
    >
      <TypeTag
        compact={compact}
        modelPickerStyle={modelPickerStyle}
        active={navFilter === "all"}
        onClick={() => onNavFilter("all")}
        label="All"
        count={totalCount}
        activeClass="bg-cyan-600 text-white"
      />
      {USER_FILE_CATEGORY_ORDER.map((cat) => {
        const count = grouped[cat].length;
        if (count === 0) return null;
        const t = CATEGORY_THEME[cat];
        return (
          <TypeTag
            key={cat}
            compact={compact}
            modelPickerStyle={modelPickerStyle}
            active={navFilter === cat}
            onClick={() => onNavFilter(cat)}
            label={USER_FILE_CATEGORY_LABELS[cat]}
            count={count}
            activeClass={`${t.chip} text-white`}
          />
        );
      })}
    </div>
  );
}

function TypeTag({
  compact,
  modelPickerStyle,
  active,
  onClick,
  label,
  count,
  activeClass,
}: {
  compact?: boolean;
  modelPickerStyle?: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  activeClass: string;
}) {
  const activeVisual = modelPickerStyle
    ? "bg-cyan-600 text-white border-transparent"
    : `${activeClass} border-transparent`;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border font-medium transition-colors active:scale-[0.98] motion-reduce:active:scale-100 ${modelPickerStyle
          ? "rounded-lg px-3 py-1.5 text-xs"
          : compact
            ? "rounded-md px-2 py-0.5 text-[11px] leading-tight"
            : "rounded-lg px-3 py-1.5 text-xs"
        } ${active
          ? activeVisual
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
    >
      {label}{" "}
      <span className="tabular-nums opacity-90">({count})</span>
    </button>
  );
}

function MoreOptionsMenu({
  viewMode,
  onViewModeChange,
  onRefresh,
}: {
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onRefresh: () => void;
}) {
  return (
    <details className="group relative">
      <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-5 w-5" aria-hidden />
        <span className="sr-only">More options</span>
      </summary>
      <div
        className="absolute right-0 z-40 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
        role="menu"
      >
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewModeChange("gallery");
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${viewMode === "gallery" ? "font-semibold text-cyan-700" : ""
            }`}
        >
          <LayoutGrid className="h-4 w-4" aria-hidden />
          Gallery view
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onViewModeChange("list");
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${viewMode === "list" ? "font-semibold text-cyan-700" : ""
            }`}
        >
          <Rows3 className="h-4 w-4" aria-hidden />
          List view
        </button>
        <div className="my-1 border-t border-gray-100" />
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onRefresh();
            (
              document.activeElement as HTMLElement | null
            )?.closest("details")?.removeAttribute("open");
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </button>
      </div>
    </details>
  );
}

function FileActionsMenu({
  compact,
  file,
  onCopy,
  onRequestClose,
  tone = "dark",
  conversationOnly = false,
}: {
  compact?: boolean;
  file: CloudFile;
  onCopy: () => void;
  onRequestClose?: () => void;
  tone?: "dark" | "light";
  /** When true, only “Open conversation” is shown (Open/Copy live on the card). */
  conversationOnly?: boolean;
}) {
  const conv = file.sourceConversationId?.trim();

  if (conversationOnly && !conv) {
    return null;
  }

  const triggerClass =
    tone === "dark"
      ? "bg-black/40 text-white hover:bg-black/55"
      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/10";

  const menuPanelClass =
    "absolute right-0 bottom-full z-[200] mb-1 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-[var(--modal-border)] dark:bg-[var(--modal-bg-muted)]";
  const menuItemClass =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10";
  const menuLinkClass =
    "flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10";

  return (
    <details className="relative z-20 open:z-30" onClick={(e) => e.stopPropagation()}>
      <summary
        className={`flex cursor-pointer list-none items-center justify-center rounded-md [&::-webkit-details-marker]:hidden ${compact ? "h-7 w-7" : "h-8 w-8"
          } ${triggerClass}`}
      >
        <MoreHorizontal
          className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
          aria-hidden
        />
        <span className="sr-only">More file actions</span>
      </summary>
      <div className={menuPanelClass}>
        {!conversationOnly ? (
          <>
            <a
              href={file.s3Link}
              target="_blank"
              rel="noopener noreferrer"
              className={menuLinkClass}
              onClick={() =>
                (
                  document.activeElement as HTMLElement | null
                )?.closest("details")?.removeAttribute("open")
              }
            >
              <FiExternalLink size={14} className="opacity-70" aria-hidden />
              Open file
            </a>
            <button
              type="button"
              className={menuItemClass}
              onClick={() => {
                onCopy();
                (
                  document.activeElement as HTMLElement | null
                )?.closest("details")?.removeAttribute("open");
              }}
            >
              <FiCopy size={14} className="opacity-70" aria-hidden />
              Copy link
            </button>
          </>
        ) : null}
        {conv ? (
          <Link
            href={`/chat/${conv}`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            onClick={() => {
              onRequestClose?.();
              (
                document.activeElement as HTMLElement | null
              )?.closest("details")?.removeAttribute("open");
            }}
          >
            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
            Open conversation
          </Link>
        ) : null}
      </div>
    </details>
  );
}

function GalleryTile({
  compact,
  isMobileLayout,
  file,
  onCopy,
  onImageClick,
  onRequestClose,
  pickMode = false,
  selected = false,
  onToggleSelect,
}: {
  compact?: boolean;
  isMobileLayout?: boolean;
  file: CloudFile;
  onCopy: (f: CloudFile) => void;
  onImageClick: (f: CloudFile) => void;
  onRequestClose?: () => void;
  pickMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const ext = getFileExtensionFromCloudFile(file);
  const cat = classifyUserFileCategory(ext);
  const theme = CATEGORY_THEME[cat];
  const isImg = isImageCloudFile(file);
  const [imgErr, setImgErr] = useState(false);

  const openExternal = useCallback(() => {
    window.open(file.s3Link, "_blank", "noopener,noreferrer");
  }, [file.s3Link]);

  const activateMain = useCallback(() => {
    if (pickMode) {
      onToggleSelect?.();
      return;
    }
    if (isImg && !imgErr) {
      onImageClick(file);
    } else {
      openExternal();
    }
  }, [pickMode, onToggleSelect, isImg, imgErr, file, onImageClick, openExternal]);

  const selectionRing = pickMode
    ? selected
      ? "ring-2 ring-cyan-500 border-cyan-400"
      : "ring-1 ring-transparent hover:ring-cyan-300"
    : "";

  const borderAccent = FILE_TYPE_LEFT_BORDER[cat];

  if (compact && isMobileLayout) {
    return (
      <article className={`group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${selectionRing}`}>
        <div className="flex h-[80px] items-center gap-2 p-2">
          <button
            type="button"
            onClick={activateMain}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            {isImg && !imgErr ? (
              <img
                src={file.s3Link}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={() => setImgErr(true)}
              />
            ) : (
              <div
                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 border-l-[4px] bg-gradient-to-br p-1 ${borderAccent} ${theme.tileAccent}`}
              >
                <span className="scale-[0.55]">{categoryIcon(cat, "sm")}</span>
                <span className="font-mono text-[8px] font-bold uppercase text-gray-800">
                  {ext || "—"}
                </span>
              </div>
            )}
          </button>

          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="line-clamp-1 text-sm font-semibold leading-tight text-gray-900">
              {buildCloudFileDisplayName(file)}
            </p>
            <p className="mt-0.5 text-[10px] tabular-nums text-gray-500">
              {formatFileByteSize(file.fileSizeInBytes)} · {timeAgo(file.createdAt)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(file);
                }}
                className="rounded bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-cyan-700"
              >
                Copy link
              </button>
              <a
                href={file.s3Link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-medium text-gray-700 underline-offset-2 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open
              </a>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-1">
            <FileActionsMenu
              compact
              file={file}
              conversationOnly
              onCopy={() => onCopy(file)}
              onRequestClose={onRequestClose}
            />
          </div>
        </div>
      </article>
    );
  }

  if (compact && !isMobileLayout) {
    return (
      <article className="group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="flex h-[144px] flex-row">
          <button
            type="button"
            onClick={activateMain}
            className="relative h-full w-28 shrink-0 overflow-hidden bg-gray-100 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1"
          >
            {isImg && !imgErr ? (
              <img
                src={file.s3Link}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={() => setImgErr(true)}
              />
            ) : (
              <div
                className={`flex h-full w-full flex-col items-center justify-center gap-1 border-l-[5px] bg-gradient-to-br px-2 py-2 ${borderAccent} ${theme.tileAccent}`}
              >
                <div className="rounded-lg bg-white/95 p-2 shadow-sm ring-1 ring-black/5">
                  {categoryIcon(cat, "sm")}
                </div>
                <p className="font-mono text-sm font-bold uppercase text-gray-900">
                  {ext || "file"}
                </p>
              </div>
            )}
          </button>

          <div className="flex min-w-0 flex-1 flex-col p-2 pl-3">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-bold leading-tight text-gray-900">
                  {buildCloudFileDisplayName(file)}
                </p>
                <p className="mt-1 text-xs text-gray-600">
                  {USER_FILE_CATEGORY_LABELS[cat]}
                </p>
              </div>
              <FileActionsMenu
                compact
                file={file}
                conversationOnly
                onCopy={() => onCopy(file)}
                onRequestClose={onRequestClose}
              />
            </div>
            <p className="mt-auto text-xs tabular-nums text-gray-500">
              {formatFileByteSize(file.fileSizeInBytes)} · {timeAgo(file.createdAt)}
            </p>
            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy(file);
                }}
                className="flex flex-1 items-center justify-center gap-1 rounded-md bg-cyan-600 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700"
              >
                <FiCopy size={13} aria-hidden />
                Copy link
              </button>
              <a
                href={file.s3Link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-1 rounded-md border border-gray-200 bg-white py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50"
                onClick={(e) => e.stopPropagation()}
              >
                <FiExternalLink size={13} aria-hidden />
                Open
              </a>
            </div>
          </div>
        </div>
      </article>
    );
  }

  const thumbMin = "min-h-[200px] sm:min-h-[220px]";
  const iconSize = "md";

  return (
    <article
      className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200/90 bg-white shadow-sm transition-shadow duration-200 hover:shadow"
    >
      <div className={`relative flex-1 ${thumbMin}`}>
        <button
          type="button"
          onClick={activateMain}
          className="absolute inset-0 z-0 block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-1"
        >
          {isImg && !imgErr ? (
            <img
              src={file.s3Link}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center gap-3 border-l-[5px] bg-gradient-to-br px-4 py-5 ${borderAccent} ${theme.tileAccent}`}
            >
              <div className="rounded-2xl bg-white/95 px-5 py-4 shadow-md ring-1 ring-black/5">
                {categoryIcon(cat, iconSize)}
              </div>
              <p className="font-mono text-2xl font-bold uppercase tracking-tight text-gray-900 sm:text-3xl">
                {ext || "file"}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-700/90">
                {USER_FILE_CATEGORY_LABELS[cat]}
              </p>
              <p className="line-clamp-2 max-w-full px-2 text-center text-[11px] font-medium leading-snug text-gray-800/95">
                {buildCloudFileDisplayName(file)}
              </p>
            </div>
          )}
        </button>
        {isImg && !imgErr ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/25 to-transparent pr-11 pl-3 pt-14 pb-2 text-white"
          >
            <p className="line-clamp-2 text-xs font-semibold drop-shadow sm:text-sm">
              {buildCloudFileDisplayName(file)}
            </p>
            <p className="mt-0.5 text-[10px] font-medium tabular-nums text-white/85 sm:text-[11px]">
              {formatFileByteSize(file.fileSizeInBytes)} ·{" "}
              {timeAgo(file.createdAt)}
            </p>
          </div>
        ) : null}
        <div className="pointer-events-auto absolute right-2 top-2 z-20">
          <FileActionsMenu
            file={file}
            conversationOnly
            onCopy={() => onCopy(file)}
            onRequestClose={onRequestClose}
          />
        </div>
      </div>
      <div className="flex items-stretch gap-1.5 border-t border-gray-100/90 bg-gray-50/50 p-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(file);
          }}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700 sm:text-sm"
        >
          <FiCopy size={15} className="opacity-95" aria-hidden />
          Copy link
        </button>
        <a
          href={file.s3Link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-800 hover:bg-gray-50 sm:text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <FiExternalLink
            size={15}
            className="opacity-80"
            aria-hidden
          />
          Open
        </a>
      </div>
    </article>
  );
}

function formatLibraryFileDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function LibraryFileList({
  mode,
  files,
  selectedIds,
  onToggleSelect,
  onCopy,
  onImageClick,
  onRequestClose,
}: {
  mode: "pick" | "browse";
  files: CloudFile[];
  selectedIds: Set<string>;
  onToggleSelect: (file: CloudFile) => void;
  onCopy: (file: CloudFile) => void;
  onImageClick: (file: CloudFile) => void;
  onRequestClose?: () => void;
}) {
  const isPick = mode === "pick";
  const [openMenuFileId, setOpenMenuFileId] = useState<string | null>(null);

  return (
    <div className="mt-1">
      <div
        className={`grid items-center gap-x-3 border-b px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 sm:gap-x-4 ${
          isPick
            ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_7rem_4.5rem]"
            : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_auto]"
        }`}
        style={{ borderColor: "var(--modal-border, #e5e7eb)" }}
        aria-hidden
      >
        {isPick ? <span className="w-5" /> : null}
        <span>Name</span>
        <span className="hidden sm:block">Modified</span>
        <span className={isPick ? "text-right" : "hidden text-right sm:block"}>Size</span>
        {!isPick ? <span className="w-8" /> : null}
      </div>
      <ul
        role={isPick ? "listbox" : "list"}
        aria-label="Files"
        aria-multiselectable={isPick || undefined}
      >
        {files.map((file) => (
          <LibraryFileRow
            key={file.id}
            mode={mode}
            file={file}
            selected={selectedIds.has(file.id)}
            onToggleSelect={() => onToggleSelect(file)}
            onCopy={() => onCopy(file)}
            onImageClick={() => onImageClick(file)}
            onRequestClose={onRequestClose}
            actionsMenuOpen={!isPick && openMenuFileId === file.id}
            onActionsMenuOpenChange={(open) =>
              setOpenMenuFileId(open ? file.id : null)
            }
          />
        ))}
      </ul>
    </div>
  );
}

function LibraryFileActionsMenu({
  file,
  isOpen,
  onOpenChange,
  onCopy,
  onRequestClose,
}: {
  file: CloudFile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onRequestClose?: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const conv = file.sourceConversationId?.trim();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight ?? 132;
    const menuWidth = 208;
    const gap = 6;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openBelow = spaceBelow >= menuHeight + gap || spaceBelow >= spaceAbove;

    setPosition({
      top: openBelow ? rect.bottom + gap : rect.top - menuHeight - gap,
      left: Math.min(
        Math.max(8, rect.right - menuWidth),
        window.innerWidth - menuWidth - 8,
      ),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const raf = requestAnimationFrame(() => updatePosition());
    return () => cancelAnimationFrame(raf);
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => onOpenChange(false);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown, true);
    };
  }, [isOpen, onOpenChange, updatePosition]);

  const menuPanel =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          (
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[120] w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-[var(--modal-border)] dark:bg-[var(--modal-bg-muted)]"
              style={{ top: position.top, left: position.left }}
              onClick={(event) => event.stopPropagation()}
            >
              <a
                href={file.s3Link}
                target="_blank"
                rel="noopener noreferrer"
                role="menuitem"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10"
                onClick={() => onOpenChange(false)}
              >
                <FiExternalLink size={14} className="opacity-70" aria-hidden />
                Open file
              </a>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[var(--modal-fg)] dark:hover:bg-white/10"
                onClick={() => {
                  onCopy();
                  onOpenChange(false);
                }}
              >
                <FiCopy size={14} className="opacity-70" aria-hidden />
                Copy link
              </button>
              {conv ? (
                <Link
                  href={`/chat/${conv}`}
                  role="menuitem"
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                  onClick={() => {
                    onRequestClose?.();
                    onOpenChange(false);
                  }}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                  Open conversation
                </Link>
              ) : null}
            </div>
          ) as any,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="File actions"
        className={`flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/10 ${
          isOpen ? "bg-gray-50 dark:bg-white/10" : ""
        }`}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!isOpen);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">More file actions</span>
      </button>
      {menuPanel}
    </>
  );
}

function LibraryFileRow({
  mode,
  file,
  selected,
  onToggleSelect,
  onCopy,
  onImageClick,
  onRequestClose,
  actionsMenuOpen = false,
  onActionsMenuOpenChange,
}: {
  mode: "pick" | "browse";
  file: CloudFile;
  selected: boolean;
  onToggleSelect: () => void;
  onCopy: () => void;
  onImageClick: () => void;
  onRequestClose?: () => void;
  actionsMenuOpen?: boolean;
  onActionsMenuOpenChange?: (open: boolean) => void;
}) {
  const isPick = mode === "pick";
  const isImg = isImageCloudFile(file);
  const [imgErr, setImgErr] = useState(false);
  const ext = getFileExtensionFromCloudFile(file);
  const cat = classifyUserFileCategory(ext);
  const displayName = buildCloudFileDisplayName(file);

  const openOrPreview = useCallback(() => {
    if (isImg && !imgErr) onImageClick();
    else window.open(file.s3Link, "_blank", "noopener,noreferrer");
  }, [isImg, imgErr, file.s3Link, onImageClick]);

  const rowInteractiveClass = selected
    ? "bg-gray-100 dark:bg-white/10"
    : "hover:bg-gray-50 dark:hover:bg-white/5";

  const nameCell = (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-white/10">
        {isImg && !imgErr ? (
          <img
            src={file.s3Link}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setImgErr(true)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <span className="scale-[0.55]">{categoryIcon(cat, "sm")}</span>
          </span>
        )}
      </span>
      <span className="min-w-0 truncate text-sm text-gray-900 dark:text-gray-100">
        {displayName}
      </span>
    </span>
  );

  if (isPick) {
    return (
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={selected}
          onClick={onToggleSelect}
          className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b px-3 py-2.5 text-left transition-colors sm:grid-cols-[auto_minmax(0,1fr)_7rem_4.5rem] sm:gap-x-4 ${rowInteractiveClass}`}
          style={{ borderColor: "var(--modal-border, #e5e7eb)" }}
        >
          <span
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? "border-gray-900 bg-gray-900 text-white dark:border-white dark:bg-white dark:text-gray-900"
                : "border-gray-300 bg-transparent dark:border-gray-500"
            }`}
            aria-hidden
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          {nameCell}
          <span className="hidden truncate text-sm text-gray-500 dark:text-gray-400 sm:block">
            {formatLibraryFileDate(file.createdAt)}
          </span>
          <span className="text-right text-sm tabular-nums text-gray-500 dark:text-gray-400">
            {formatFileByteSize(file.fileSizeInBytes)}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b px-3 py-2.5 transition-colors sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_auto] sm:gap-x-4 ${rowInteractiveClass}`}
        style={{ borderColor: "var(--modal-border, #e5e7eb)" }}
      >
        <button
          type="button"
          onClick={openOrPreview}
          className="min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
        >
          {nameCell}
        </button>
        <span className="hidden truncate text-sm text-gray-500 dark:text-gray-400 sm:block">
          {formatLibraryFileDate(file.createdAt)}
        </span>
        <span className="hidden text-right text-sm tabular-nums text-gray-500 dark:text-gray-400 sm:block">
          {formatFileByteSize(file.fileSizeInBytes)}
        </span>
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <LibraryFileActionsMenu
            file={file}
            isOpen={actionsMenuOpen}
            onOpenChange={(open) => onActionsMenuOpenChange?.(open)}
            onCopy={onCopy}
            onRequestClose={onRequestClose}
          />
        </div>
      </div>
    </li>
  );
}

function ListRow({
  file,
  onCopy,
  onImageClick,
  onRequestClose,
  pickMode = false,
  selected = false,
  onToggleSelect,
}: {
  file: CloudFile;
  onCopy: (f: CloudFile) => void;
  onImageClick: (f: CloudFile) => void;
  onRequestClose?: () => void;
  pickMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const isImg = isImageCloudFile(file);
  const [imgErr, setImgErr] = useState(false);
  const ext = getFileExtensionFromCloudFile(file);
  const cat = classifyUserFileCategory(ext);
  const theme = CATEGORY_THEME[cat];
  const borderAccent = FILE_TYPE_LEFT_BORDER[cat];

  const openOrPreview = useCallback(() => {
    if (pickMode) {
      onToggleSelect?.();
      return;
    }
    if (isImg && !imgErr) onImageClick(file);
    else window.open(file.s3Link, "_blank");
  }, [pickMode, onToggleSelect, file, imgErr, isImg, onImageClick]);

  return (
    <li>
      <div className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 transition-colors hover:border-gray-300 sm:gap-4 sm:p-3 ${pickMode && selected ? "border-cyan-500 ring-2 ring-cyan-500/30" : "border-gray-200"}`}>
        <button
          type="button"
          onClick={openOrPreview}
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 sm:h-20 sm:w-20 ${!isImg || imgErr ? borderAccent : "border-l-4 border-l-transparent"}`}
        >
          {isImg && !imgErr ? (
            <img
              src={file.s3Link}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={() => setImgErr(true)}
            />
          ) : (
            <div
              className={`flex h-full w-full flex-col items-center justify-center gap-0.5 bg-gradient-to-br p-1 ${theme.tileAccent}`}
            >
              <span className="scale-[0.65] sm:scale-75">{categoryIcon(cat, "sm")}</span>
              <span className="font-mono text-[9px] font-bold uppercase text-gray-800">
                {ext || "—"}
              </span>
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 sm:text-base">
            {buildCloudFileDisplayName(file)}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 tabular-nums sm:text-sm">
            <span className="font-mono font-medium text-gray-700">
              {ext.toUpperCase()}
            </span>{" "}
            · {formatFileByteSize(file.fileSizeInBytes)} · {timeAgo(file.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pickMode ? (
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                selected
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-gray-300 bg-white text-transparent"
              }`}
              aria-hidden
            >
              <Check className="h-4 w-4" />
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onCopy(file)}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700 sm:text-sm"
                title="Copy link"
              >
                Copy
              </button>
              <a
                href={file.s3Link}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-50 sm:inline-flex sm:items-center sm:gap-1 sm:text-sm"
                title="Open file"
          >
            <FiExternalLink size={14} aria-hidden />
            <span className="sr-only sm:not-sr-only">Open</span>
          </a>
          <FileActionsMenu
            file={file}
            tone="light"
            conversationOnly
            onCopy={() => onCopy(file)}
            onRequestClose={onRequestClose}
          />
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function ImageLightbox({
  file,
  onClose,
}: {
  file: CloudFile;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    (
      <div
        role="presentation"
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <button
          type="button"
          aria-label="Close preview"
          className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white ring-1 ring-white/30 hover:bg-white/25"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>
        <div
          className="max-h-[90vh] max-w-[min(96vw,1200px)] overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/15"
          onClick={(e) => e.stopPropagation()}
          role="img"
          aria-label={buildCloudFileDisplayName(file)}
        >
          <img
            src={file.s3Link}
            alt=""
            className="max-h-[85vh] w-auto max-w-full object-contain"
            decoding="async"
          />
        </div>
        <p className="absolute bottom-4 left-1/2 max-w-[90vw] -translate-x-1/2 truncate rounded-full bg-black/55 px-4 py-1.5 text-center text-sm font-medium text-white backdrop-blur-md">
          {buildCloudFileDisplayName(file)}
        </p>
      </div>) as any,
    document.body,
  );
}

function EmptyLibraryState({
  variant,
  onRequestClose,
}: {
  variant: UserFilesBrowserVariant;
  onRequestClose?: () => void;
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/50">
      <div className="p-6 sm:p-8">
        <h3 className="text-lg font-bold text-gray-900">No uploads yet</h3>
        <p className="mt-2 max-w-lg text-sm text-gray-600">
          Attach files from chat. When a conversation is linked, use the menu on
          each file to jump back.
        </p>
      </div>
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        {variant === "modal" && onRequestClose ? (
          <button
            type="button"
            onClick={onRequestClose}
            className="w-full rounded-lg bg-cyan-600 py-3 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Back to chat
          </button>
        ) : (
          <Link
            href="/"
            className="block w-full rounded-lg bg-cyan-600 py-3 text-center text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Open chat
          </Link>
        )}
      </div>
    </div>
  );
}
