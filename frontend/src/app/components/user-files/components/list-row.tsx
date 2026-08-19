"use client";

import { useCallback, useState } from "react";
import { Check } from "lucide-react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import { timeAgo } from "@/lib/time-ago";
import { CATEGORY_THEME } from "../user-files.theme";
import {
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
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