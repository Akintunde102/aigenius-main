"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { MODAL_POPOVER_Z_INDEX } from "@/lib/utils/modal-z-index";

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
    <div className="mt-0">
      <div
        className={`grid items-center gap-x-3 border-b px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-[2] sm:gap-x-4 ${
          isPick
            ? "grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_7rem_4.5rem]"
            : "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_auto]"
        }`}
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--modal-bg-muted)",
          color: "var(--modal-muted-fg)",
        }}
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
  onOpenOrPreview,
  onCopy,
  onRequestClose,
}: {
  file: CloudFile;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenOrPreview: () => void;
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
              className="fixed w-52 rounded-xl border p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100"
              style={{
                zIndex: MODAL_POPOVER_Z_INDEX,
                top: position.top,
                left: position.left,
                background: "var(--modal-bg)",
                borderColor: "var(--modal-border)",
                color: "var(--modal-fg)",
                boxShadow: "0 20px 40px -10px rgba(0, 0, 0, 0.45)",
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors hover:bg-[var(--surface-muted)]"
                style={{ color: "var(--modal-fg)" }}
                onClick={() => {
                  onOpenOrPreview();
                  onOpenChange(false);
                }}
              >
                <FiExternalLink size={14} style={{ color: "var(--modal-muted-fg)" }} aria-hidden />
                Open file
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium rounded-lg transition-colors hover:bg-[var(--surface-muted)]"
                style={{ color: "var(--modal-fg)" }}
                onClick={() => {
                  onCopy();
                  onOpenChange(false);
                }}
              >
                <FiCopy size={14} style={{ color: "var(--modal-muted-fg)" }} aria-hidden />
                Copy link
              </button>
              {conv ? (
                <Link
                  href={`/chat/${conv}`}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  onClick={() => {
                    onRequestClose?.();
                    onOpenChange(false);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden />
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
        className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
          isOpen
            ? "border-[var(--modal-border)] bg-[var(--surface-muted)]"
            : "border-transparent hover:border-[var(--modal-border)] hover:bg-[var(--surface-muted)]"
        }`}
        style={{
          color: isOpen ? "var(--modal-fg)" : "var(--modal-muted-fg)",
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!isOpen);
        }}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
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

  const rowInteractiveClass = selected
    ? "bg-[color-mix(in_srgb,var(--chat-accent)_12%,var(--modal-bg))] dark:bg-[color-mix(in_srgb,var(--chat-accent)_16%,var(--modal-bg))]"
    : "hover:bg-[var(--surface-muted)] transition-colors";

  const nameCell = (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border flex items-center justify-center shadow-xs"
        style={{
          borderColor: "var(--modal-border)",
          background: "var(--surface-muted)",
        }}
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
          <span className="flex h-full w-full items-center justify-center">
            <span className="scale-[0.6]">{categoryIcon(cat, "sm")}</span>
          </span>
        )}
      </span>
      <span
        className="min-w-0 truncate text-sm font-medium"
        style={{ color: "var(--modal-fg)" }}
      >
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
          className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b px-3.5 py-2.5 text-left transition-colors sm:grid-cols-[auto_minmax(0,1fr)_7rem_4.5rem] sm:gap-x-4 ${rowInteractiveClass}`}
          style={{ borderColor: "var(--modal-border)" }}
        >
          <span
            className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
              selected
                ? "border-[var(--chat-accent)] bg-[var(--chat-accent)] text-white"
                : "border-[var(--modal-border)] bg-transparent"
            }`}
            aria-hidden
          >
            {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
          </span>
          {nameCell}
          <span
            className="hidden truncate text-xs tabular-nums sm:block"
            style={{ color: "var(--modal-muted-fg)" }}
          >
            {formatLibraryFileDate(file.createdAt)}
          </span>
          <span
            className="text-right text-xs tabular-nums"
            style={{ color: "var(--modal-muted-fg)" }}
          >
            {formatFileByteSize(file.fileSizeInBytes)}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <div
        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b px-3.5 py-2.5 transition-colors sm:grid-cols-[minmax(0,1fr)_7rem_4.5rem_auto] sm:gap-x-4 ${rowInteractiveClass}`}
        style={{ borderColor: "var(--modal-border)" }}
      >
        <button
          type="button"
          onClick={openOrPreview}
          className="min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1"
        >
          {nameCell}
        </button>
        <span
          className="hidden truncate text-xs tabular-nums sm:block"
          style={{ color: "var(--modal-muted-fg)" }}
        >
          {formatLibraryFileDate(file.createdAt)}
        </span>
        <span
          className="hidden text-right text-xs tabular-nums sm:block"
          style={{ color: "var(--modal-muted-fg)" }}
        >
          {formatFileByteSize(file.fileSizeInBytes)}
        </span>
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
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