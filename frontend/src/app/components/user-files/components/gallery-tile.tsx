"use client";

import { useCallback, useState } from "react";
import { FiCopy, FiExternalLink } from "react-icons/fi";
import type { CloudFile } from "@/app/components/file/file.interface";
import { timeAgo } from "@/lib/time-ago";
import { CATEGORY_THEME } from "../user-files.theme";
import {
  USER_FILE_CATEGORY_LABELS,
  buildCloudFileDisplayName,
  classifyUserFileCategory,
  formatFileByteSize,
  getFileExtensionFromCloudFile,
  isImageCloudFile,
} from "../user-files.utils";
import { categoryIcon } from "./category-icon";
import { FileActionsMenu } from "./file-actions-menu";
import { FILE_TYPE_LEFT_BORDER } from "./user-files-browser.types";


export function GalleryTile({
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