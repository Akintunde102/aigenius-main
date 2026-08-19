"use client";

import type { CloudFile } from "@/app/components/file/file.interface";
import type { UserFileCategory } from "../user-files.utils";

export type UserFilesBrowserVariant = "page" | "modal";
export type UserFilesBrowserMode = "browse" | "pick";
export type NavFilter = "all" | UserFileCategory;
export type ViewMode = "gallery" | "list";

export interface UserFilesBrowserProps {
  variant: UserFilesBrowserVariant;
  mode?: UserFilesBrowserMode;
  onRequestClose?: () => void;
  library?: import("../useUploadedFilesList").UploadedFilesLibraryState;
  isMobileLayout?: boolean;
  maxPickCount?: number;
  onConfirmPick?: (files: CloudFile[]) => void;
}

export const FILE_TYPE_LEFT_BORDER: Record<UserFileCategory, string> = {
  images: "border-l-emerald-500",
  documents: "border-l-sky-500",
  spreadsheets: "border-l-amber-500",
  presentations: "border-l-rose-500",
  code: "border-l-slate-600",
  archives: "border-l-orange-600",
  audio_video: "border-l-lime-600",
  other: "border-l-gray-500",
};
