"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { CloudFile } from "@/app/components/file/file.interface";
import { buildCloudFileDisplayName } from "../user-files.utils";


export function ImageLightbox({
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