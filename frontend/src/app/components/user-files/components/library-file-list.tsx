"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MessageSquare, MoreHorizontal } from "lucide-react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import {
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
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