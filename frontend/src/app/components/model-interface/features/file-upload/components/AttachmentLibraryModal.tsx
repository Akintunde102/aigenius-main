"use client";

import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";
import type { CloudFile } from "@/app/components/file/file.interface";
import { AppModal, AppModalHeader } from "@/app/components/modals/AppModal";
import { useLanguage } from "@/lib/providers/LanguageProvider";

export interface AttachmentLibraryModalProps {
  onClose: () => void;
  library: UploadedFilesLibraryState;
  onConfirm: (files: CloudFile[]) => void;
}

export function AttachmentLibraryModal({
  onClose,
  library,
  onConfirm,
}: AttachmentLibraryModalProps) {
  const { t } = useLanguage();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
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

  return (
    <AppModal
      open
      onClose={onClose}
      size="xl"
      className="z-[110]"
      mobileFullScreen={isMobile}
      closeOnEscape={false}
      ariaLabelledBy="attachment-library-title"
    >
      <AppModalHeader
        titleId="attachment-library-title"
        title={t("modals.chooseFromMyFiles", "Choose from My Files")}
        subtitle={t(
          "modals.chooseFromMyFilesSubtitle",
          "Select files from your library to attach to this conversation."
        )}
        onClose={onClose}
      />

      <div className="attachment-library-browser flex min-h-0 flex-1 flex-col overflow-hidden">
        <UserFilesBrowser
          variant="modal"
          mode="pick"
          library={library}
          onRequestClose={onClose}
          onConfirmPick={onConfirm}
          isMobileLayout={isMobile}
        />
      </div>
    </AppModal>
  );
}
