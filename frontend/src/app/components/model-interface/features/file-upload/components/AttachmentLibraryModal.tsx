"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import type { CloudFile } from "@/app/components/file/file.interface";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";

export interface AttachmentLibraryModalProps {
  onClose: () => void;
  onAttach: (files: CloudFile[]) => void;
  library: UploadedFilesLibraryState;
  maxSelection?: number;
}

export function AttachmentLibraryModal({
  onClose,
  onAttach,
  library,
  maxSelection = 10,
}: AttachmentLibraryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.body.dataset.myfilesLightbox === "1") return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const portalTarget = document.getElementById("modal-root") ?? document.body;

  return createPortal(
    (
      <div
        role="presentation"
        className={`fixed inset-0 z-[110] flex justify-center bg-black/30 p-0 ${
          isMobile ? "items-stretch" : "items-center"
        }`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attachment-library-title"
          className={`flex w-full flex-col overflow-hidden border shadow-2xl ${
            isMobile
              ? "h-full max-h-none rounded-none"
              : "h-[min(85vh,720px)] max-h-[min(94vh,720px)] max-w-2xl rounded-xl"
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--modal-bg)",
            borderColor: "var(--modal-border)",
            color: "var(--modal-fg)",
          }}
        >
          <div className="flex-shrink-0 border-b" style={{ borderColor: "var(--modal-border)" }}>
            <div
              className={`flex items-center justify-between ${isMobile ? "px-3 py-2" : "px-4 py-3"}`}
            >
              <h2
                id="attachment-library-title"
                className={`font-semibold ${isMobile ? "text-base" : "text-lg"}`}
              >
                Library
              </h2>
              <button
                type="button"
                aria-label="Close"
                className="rounded p-1 transition-colors hover:text-red-500"
                style={{ color: "var(--modal-muted-fg)" }}
                onClick={onClose}
              >
                <FiX size={isMobile ? 20 : 22} aria-hidden />
              </button>
            </div>
          </div>

          <div className="attachment-library-browser flex min-h-0 flex-1 flex-col overflow-hidden">
            <UserFilesBrowser
              variant="modal"
              mode="pick"
              library={library}
              onRequestClose={onClose}
              isMobileLayout={isMobile}
              maxPickCount={maxSelection}
              onConfirmPick={(files) => {
                onAttach(files);
                onClose();
              }}
            />
          </div>
        </div>
        <style jsx>{`
          :global(.dark) :global(.attachment-library-browser) {
            background-color: var(--modal-bg) !important;
            color: var(--modal-fg) !important;
          }
          :global(.dark) :global(.attachment-library-browser input) {
            background-color: var(--modal-bg-muted) !important;
            color: var(--modal-fg) !important;
            border-color: var(--modal-border) !important;
          }
          :global(.dark) :global(.attachment-library-browser .sticky) {
            background-color: var(--modal-bg) !important;
            border-color: var(--modal-border) !important;
          }
        `}</style>
      </div>
    ) as any,
    portalTarget,
  );
}
