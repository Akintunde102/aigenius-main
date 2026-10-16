"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, MessageSquare, MoreHorizontal } from "lucide-react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import { openFilePreview } from "@/app/components/modals/FilePreviewManager";
import {
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
  inferPreviewTypeFromCloudFile,
  isImageCloudFile,
} from "../user-files.utils";
import { categoryIcon } from "./category-icon";

function formatLibraryFileDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function LibraryFileList({
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
    <div className="p-3.5 sm:p-5">
      <ul
        role={isPick ? "listbox" : "list"}
        aria-label="Files"
        aria-multiselectable={isPick || undefined}
        className="space-y-1.5"
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
  isOpen = false,
  onOpenChange,
  onOpenOrPreview,
  onCopy,
  onRequestClose,
}: {
  file: CloudFile;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOpenOrPreview: () => void;
  onCopy: () => void;
  onRequestClose?: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const conv = file.sourceConversationId?.trim();
  const [openUpward, setOpenUpward] = useState(false);

  useEffect(() => {
    if (detailsRef.current && detailsRef.current.open !== isOpen) {
      if (isOpen) {
        detailsRef.current.setAttribute("open", "");
      } else {
        detailsRef.current.removeAttribute("open");
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (detailsRef.current?.open && !detailsRef.current.contains(e.target as Node)) {
        detailsRef.current.removeAttribute("open");
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && detailsRef.current?.open) {
        e.preventDefault();
        detailsRef.current.removeAttribute("open");
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 150);
    }
  };

  return (
    <details
      ref={detailsRef}
      className="relative z-20 open:z-30"
      onToggle={handleToggle}
      onClick={(e) => e.stopPropagation()}
    >
      <summary
        role="button"
        aria-label="More file actions"
        className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg border border-transparent text-[var(--sidebar-muted-fg)] transition-colors hover:border-[var(--modal-border)] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--sidebar-fg)] [&::-webkit-details-marker]:hidden"
        title="File actions"
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
        <span className="sr-only">More file actions</span>
      </summary>

      <div
        role="menu"
        className={`absolute right-0 z-50 w-48 rounded-xl border p-1 shadow-xl ${
          openUpward ? "bottom-full mb-1" : "top-full mt-1"
        }`}
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--modal-bg)",
          color: "var(--modal-fg)",
        }}
      >
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium rounded-lg text-[var(--sidebar-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          onClick={() => {
            onOpenOrPreview();
            detailsRef.current?.removeAttribute("open");
          }}
        >
          <FiExternalLink size={14} className="text-[var(--sidebar-muted-fg)]" aria-hidden />
          Open file
        </button>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium rounded-lg text-[var(--sidebar-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          onClick={() => {
            onCopy();
            detailsRef.current?.removeAttribute("open");
          }}
        >
          <FiCopy size={14} className="text-[var(--sidebar-muted-fg)]" aria-hidden />
          Copy link
        </button>
        {conv ? (
          <Link
            href={`/chat/${conv}`}
            role="menuitem"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-[var(--chat-accent)] hover:bg-[var(--chat-accent)]/10 transition-colors"
            onClick={() => {
              onRequestClose?.();
              detailsRef.current?.removeAttribute("open");
            }}
          >
            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Open conversation
          </Link>
        ) : null}
      </div>
    </details>
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
  const cat = classifyUserFileCategory(ext, file.s3Link);
  const displayName = buildCloudFileDisplayName(file);
  const conv = file.sourceConversationId?.trim();

  const openOrPreview = useCallback(() => {
    if (isImg && !imgErr) {
      onImageClick();
    } else {
      const previewType = inferPreviewTypeFromCloudFile(file);
      openFilePreview({
        url: file.s3Link,
        name: displayName,
        type: previewType,
      });
    }
  }, [isImg, imgErr, file, displayName, onImageClick]);

  if (isPick) {
    return (
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={selected}
          onClick={onToggleSelect}
          className={`app-model-card group relative flex w-full items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
            selected
              ? "app-model-card--selected ring-1 ring-[var(--chat-accent)] border-[var(--chat-accent)]"
              : "border-[var(--modal-border)] hover:border-[color-mix(in_srgb,var(--modal-border)_80%,transparent)] hover:bg-[var(--surface-muted)]"
          }`}
          style={{
            background: selected
              ? "color-mix(in srgb, var(--chat-accent) 6%, var(--modal-bg))"
              : "var(--modal-bg)",
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected
                  ? "border-[var(--chat-accent)] bg-[var(--chat-accent)] text-white"
                  : "border-[var(--sidebar-border)] bg-transparent"
              }`}
              aria-hidden
            >
              {selected ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>

            <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--modal-border)] bg-[var(--surface-muted)] flex items-center justify-center shadow-xs">
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
                <span className="flex h-full w-full items-center justify-center text-[var(--sidebar-muted-fg)]">
                  <span className="scale-[0.7]">{categoryIcon(cat, "sm")}</span>
                </span>
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="truncate text-[13px] font-medium text-[var(--sidebar-fg)] tracking-tight"
                  title={displayName}
                >
                  {displayName}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-normal text-[var(--sidebar-muted-fg)] tabular-nums mt-0.5">
                <span className="font-mono text-[9.5px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[var(--sidebar-fg)] tracking-wider">
                  {ext || "FILE"}
                </span>
                <span className="opacity-40">·</span>
                <span>{formatFileByteSize(file.fileSizeInBytes)}</span>
                <span className="opacity-40">·</span>
                <span>{formatLibraryFileDate(file.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            {selected ? (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                  color: "var(--chat-accent)",
                }}
              >
                Selected
              </span>
            ) : (
              <span className="text-[11px] text-[var(--sidebar-muted-fg)] opacity-0 group-hover:opacity-100 transition-opacity">
                Select
              </span>
            )}
          </div>
        </button>
      </li>
    );
  }

  return (
    <li>
      <div
        className="app-model-card group relative flex w-full items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border border-[var(--modal-border)] text-left transition-all duration-150 hover:border-[color-mix(in_srgb,var(--modal-border)_80%,transparent)] hover:bg-[var(--surface-muted)]"
        style={{ background: "var(--modal-bg)" }}
      >
        <button
          type="button"
          onClick={openOrPreview}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 rounded-lg"
        >
          <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--modal-border)] bg-[var(--surface-muted)] flex items-center justify-center shadow-xs">
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
              <span className="flex h-full w-full items-center justify-center text-[var(--sidebar-muted-fg)]">
                <span className="scale-[0.7]">{categoryIcon(cat, "sm")}</span>
              </span>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="truncate text-[13px] font-medium text-[var(--sidebar-fg)] tracking-tight group-hover:text-[var(--modal-fg)] transition-colors"
                title={displayName}
              >
                {displayName}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-normal text-[var(--sidebar-muted-fg)] tabular-nums mt-0.5">
              <span className="font-mono text-[9.5px] font-semibold uppercase px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-[var(--sidebar-fg)] tracking-wider">
                {ext || "FILE"}
              </span>
              <span className="opacity-40">·</span>
              <span>{formatFileByteSize(file.fileSizeInBytes)}</span>
              <span className="opacity-40">·</span>
              <span>{formatLibraryFileDate(file.createdAt)}</span>
              {conv ? (
                <>
                  <span className="opacity-40">·</span>
                  <Link
                    href={`/chat/${conv}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestClose?.();
                    }}
                    className="inline-flex items-center gap-1 text-[var(--sidebar-muted-fg)] hover:text-[var(--chat-accent)] transition-colors"
                    title="Open source conversation"
                  >
                    <MessageSquare className="h-3 w-3 shrink-0" aria-hidden />
                    <span>chat</span>
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Copy link"
          >
            <FiCopy size={13} aria-hidden />
            <span className="hidden sm:inline">Copy</span>
          </button>
          <button
            type="button"
            onClick={openOrPreview}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-[var(--sidebar-muted-fg)] hover:text-[var(--sidebar-fg)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Open or preview"
          >
            <FiExternalLink size={13} aria-hidden />
            <span className="hidden sm:inline">Open</span>
          </button>
          <LibraryFileActionsMenu
            file={file}
            isOpen={actionsMenuOpen}
            onOpenChange={(open) => onActionsMenuOpenChange?.(open)}
            onOpenOrPreview={openOrPreview}
            onCopy={onCopy}
            onRequestClose={onRequestClose}
          />
        </div>
      </div>
    </li>
  );
}