"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import { openFilePreview } from "@/app/components/modals/FilePreviewManager";
import { timeAgo } from "@/lib/time-ago";
import { CATEGORY_THEME } from "../user-files.theme";
import {
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
  inferPreviewTypeFromCloudFile,
  isImageCloudFile,
} from "../user-files.utils";
import { categoryIcon } from "./category-icon";
import { FileActionsMenu } from "./file-actions-menu";
import { FILE_TYPE_LEFT_BORDER } from "./user-files-browser.types";


export function ListRow({
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
  const cat = classifyUserFileCategory(ext, file.s3Link);
  const theme = CATEGORY_THEME[cat];
  const borderAccent = FILE_TYPE_LEFT_BORDER[cat];
  const displayName = buildCloudFileDisplayName(file);

  const openOrPreview = useCallback(() => {
    if (pickMode) {
      onToggleSelect?.();
      return;
    }
    if (isImg && !imgErr) {
      onImageClick(file);
    } else {
      const previewType = inferPreviewTypeFromCloudFile(file);
      openFilePreview({
        url: file.s3Link,
        name: displayName,
        type: previewType,
      });
    }
  }, [pickMode, onToggleSelect, isImg, imgErr, file, displayName, onImageClick]);

  return (
    <li>
      <div
        className={`app-model-card group flex items-center gap-3 rounded-xl border p-2.5 transition-colors sm:gap-4 sm:p-3 ${
          pickMode && selected
            ? "app-model-card--selected ring-1 ring-[var(--chat-accent)] border-[var(--chat-accent)]"
            : "border-[var(--modal-border)] hover:border-[var(--sidebar-border)]"
        }`}
        style={{ background: "var(--modal-bg)" }}
      >
        <button
          type="button"
          onClick={openOrPreview}
          className={`relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-muted)] border border-[var(--modal-border)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40`}
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
              className={`flex h-full w-full flex-col items-center justify-center gap-0.5 p-1`}
            >
              <span className="scale-[0.65] sm:scale-75 text-[var(--sidebar-muted-fg)]">{categoryIcon(cat, "sm")}</span>
              <span className="font-mono text-[9px] font-bold uppercase text-[var(--sidebar-fg)]">
                {ext || "—"}
              </span>
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--sidebar-fg)]" title={displayName}>
            {displayName}
          </p>
          <p className="mt-0.5 text-xs text-[var(--sidebar-muted-fg)] tabular-nums">
            <span className="font-mono font-medium text-[var(--sidebar-fg)]">
              {ext.toUpperCase()}
            </span>{" "}
            · {formatFileByteSize(file.fileSizeInBytes)} · {timeAgo(file.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pickMode ? (
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                selected
                  ? "border-[var(--chat-accent)] bg-[var(--chat-accent)] text-white"
                  : "border-[var(--modal-border)] bg-transparent text-transparent"
              }`}
              aria-hidden
            >
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onCopy(file)}
                className="app-modal-btn-primary h-7 px-2.5 text-xs font-semibold"
                title="Copy link"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={openOrPreview}
                className="app-modal-btn-secondary h-7 px-2 text-xs font-medium inline-flex items-center gap-1"
                title="Open file"
              >
                <FiExternalLink size={13} aria-hidden />
                <span className="hidden sm:inline">Open</span>
              </button>
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