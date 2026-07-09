"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";

export interface MyFilesModalProps {
  onClose: () => void;
  library: UploadedFilesLibraryState;
}

/** Match `ModelSelectionModal` shell: overlay, frosted panel, header row, flex body. */
const MyFilesModal: React.FC<MyFilesModalProps> = ({ onClose, library }) => {
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
      e.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const portalTarget =
    document.getElementById("modal-root") ?? document.body;

  const modalContent = (
    <div
      role="presentation"
      className={`fixed inset-0 z-[100] flex justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-200 ease-out p-0 ${
        isMobile ? "items-stretch" : "items-center"
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-files-modal-title"
        className={`flex w-full flex-col overflow-hidden border shadow-2xl backdrop-blur-md transform transition-all duration-200 ease-out ${
          isMobile
            ? "h-full max-h-none rounded-none"
            : "max-h-[min(94vh,900px)] max-w-6xl rounded-xl h-[85vh]"
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
            className={`flex items-center justify-between ${isMobile ? "px-2 py-0.5" : "px-4 py-0.5"}`}
          >
            <h2
              id="my-files-modal-title"
              className={`font-bold ${isMobile ? "text-sm" : "text-lg"}`}
            >
              My files
            </h2>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              className="p-1 transition-colors duration-200 hover:text-red-500"
              style={{ color: "var(--modal-muted-fg)" }}
              onClick={onClose}
            >
              <FiX size={isMobile ? 20 : 22} aria-hidden />
            </button>
          </div>
        </div>

        <div className="my-files-browser-container flex min-h-0 flex-1 flex-col overflow-hidden">
          <UserFilesBrowser
            variant="modal"
            library={library}
            onRequestClose={onClose}
            isMobileLayout={isMobile}
          />
        </div>
      </div>
      <style jsx>{`
        .animate-fadeIn { animation: fadeIn 0.4s; }
        .animate-slideUp { animation: slideUp 0.4s; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        /* Dark mode overrides for internal UserFilesBrowser components */
        :global(.dark) :global(.my-files-browser-container) {
            background-color: var(--modal-bg) !important;
            color: var(--modal-fg) !important;
        }
        :global(.dark) :global(.my-files-browser-container input) {
            background-color: var(--modal-bg-muted) !important;
            color: var(--modal-fg) !important;
            border-color: var(--modal-border) !important;
        }
        :global(.dark) :global(.my-files-browser-container .sticky) {
            background-color: var(--modal-bg) !important;
            border-color: var(--modal-border) !important;
        }
        :global(.dark) :global(.my-files-browser-container button[role="tab"]:not([aria-selected="true"])) {
            background-color: var(--modal-bg-muted) !important;
            color: var(--modal-muted-fg) !important;
            border-color: var(--modal-border) !important;
        }
        :global(.dark) :global(.my-files-browser-container button[role="tab"]:not([aria-selected="true"]):hover) {
            background-color: var(--modal-bg) !important;
            color: var(--modal-fg) !important;
        }
        :global(.dark) :global(.my-files-browser-container article),
        :global(.dark) :global(.my-files-browser-container .border),
        :global(.dark) :global(.my-files-browser-container [class*="border"]) {
            border-color: var(--modal-border) !important;
        }
        :global(.dark) :global(.my-files-browser-container article),
        :global(.dark) :global(.my-files-browser-container [class*="bg-white"]),
        :global(.dark) :global(.my-files-browser-container [class*="bg-slate-50"]),
        :global(.dark) :global(.my-files-browser-container [class*="bg-gray-50"]) {
            background-color: var(--modal-bg-muted) !important;
        }
        :global(.dark) :global(.my-files-browser-container [class*="text-gray-900"]),
        :global(.dark) :global(.my-files-browser-container [class*="text-gray-800"]) {
            color: var(--modal-fg) !important;
        }
        :global(.dark) :global(.my-files-browser-container [class*="text-gray-700"]),
        :global(.dark) :global(.my-files-browser-container [class*="text-gray-600"]),
        :global(.dark) :global(.my-files-browser-container [class*="text-gray-500"]) {
            color: var(--modal-muted-fg) !important;
        }
        :global(.dark) :global(.my-files-browser-container [class*="absolute"][class*="bg-white"]) {
            background-color: var(--modal-bg) !important;
            border-color: var(--modal-border) !important;
            color: var(--modal-fg) !important;
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent as any, portalTarget);
};

export default MyFilesModal;
