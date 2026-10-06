"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Folder } from "lucide-react";
import { FiX } from "react-icons/fi";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";

export interface MyFilesModalProps {
  onClose: () => void;
  library: UploadedFilesLibraryState;
}

const MyFilesModal: React.FC<MyFilesModalProps> = ({ onClose, library }) => {
  const { t } = useLanguage();
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

  const portalTarget = document.getElementById("modal-root") ?? document.body;
  const filesCount = library.files?.length ?? 0;

  return createPortal(
    (
      <div
        role="presentation"
        className={`app-modal-overlay backdrop-blur-[2px] ${isMobile ? "p-0" : ""}`}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="my-files-modal-title"
          className={`app-modal-panel ${
            isMobile
              ? "h-full max-h-none rounded-none border-0"
              : "h-[min(85vh,720px)] max-h-[min(90vh,720px)] max-w-2xl sm:max-w-3xl shadow-2xl"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="app-modal-panel-header flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                  color: "var(--chat-accent)",
                }}
                aria-hidden
              >
                <Folder className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    id="my-files-modal-title"
                    className="text-base font-semibold leading-none"
                    style={{ color: "var(--modal-fg)" }}
                  >
                    {t("modals.myFilesTitle", "My files")}
                  </h2>
                  {filesCount > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                      style={{
                        background: "color-mix(in srgb, var(--modal-fg) 8%, transparent)",
                        color: "var(--modal-muted-fg)",
                      }}
                    >
                      {filesCount}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                  {t("modals.myFilesSubtitle", "Browse, search, and manage your uploaded files")}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label={t("common.close", "Close")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500 focus-visible:outline-none"
              style={{ color: "var(--modal-muted-fg)" }}
              onClick={onClose}
            >
              <FiX className="h-4 w-4" />
            </button>
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
      </div>
    ) as any,
    portalTarget,
  );
};

export default MyFilesModal;
