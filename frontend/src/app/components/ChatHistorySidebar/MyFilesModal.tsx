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
        className={`flex w-full flex-col overflow-hidden border border-white/40 bg-white/92 shadow-2xl backdrop-blur-md transform transition-all duration-200 ease-out ${
          isMobile
            ? "h-full max-h-none rounded-none"
            : "max-h-[min(94vh,900px)] max-w-6xl rounded-xl h-[85vh]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-gray-200">
          <div
            className={`flex items-center justify-between ${isMobile ? "px-2 py-0.5" : "px-4 py-0.5"}`}
          >
            <h2
              id="my-files-modal-title"
              className={`font-bold text-gray-900 ${isMobile ? "text-sm" : "text-lg"}`}
            >
              My files
            </h2>
            <button
              type="button"
              aria-label="Close"
              title="Close"
              className="p-1 text-gray-400 transition-colors duration-200 hover:text-red-500"
              onClick={onClose}
            >
              <FiX size={isMobile ? 20 : 22} aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <UserFilesBrowser
            variant="modal"
            library={library}
            onRequestClose={onClose}
            isMobileLayout={isMobile}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent as any, portalTarget);
};

export default MyFilesModal;
