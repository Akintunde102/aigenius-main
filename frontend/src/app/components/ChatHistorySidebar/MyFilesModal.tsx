"use client";

import React, { useEffect, useState } from "react";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import { useLanguage } from "@/lib/providers/LanguageProvider";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";
import { AppModal, AppModalHeader } from "@/app/components/modals/AppModal";

export interface MyFilesModalProps {
  onClose: () => void;
  library: UploadedFilesLibraryState;
}

const MyFilesModal: React.FC<MyFilesModalProps> = ({ onClose, library }) => {
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

  const filesCount = library.files?.length ?? 0;
  const subtitle =
    filesCount > 0
      ? `${filesCount} ${filesCount === 1 ? "file" : "files"} · ${t("modals.myFilesSubtitle", "Browse, search, and manage your uploaded files")}`
      : t("modals.myFilesSubtitle", "Browse, search, and manage your uploaded files");

  return (
    <AppModal
      open
      onClose={onClose}
      size="tall"
      mobileFullScreen={isMobile}
      closeOnEscape={false}
      ariaLabelledBy="my-files-modal-title"
      panelClassName="!max-h-[min(90vh,720px)]"
    >
      <AppModalHeader
        titleId="my-files-modal-title"
        title={t("modals.myFilesTitle", "My files")}
        subtitle={subtitle}
        onClose={onClose}
      />
      <div className="my-files-browser-container flex min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0 pt-0">
        <UserFilesBrowser
          variant="modal"
          library={library}
          onRequestClose={onClose}
          isMobileLayout={isMobile}
        />
      </div>
    </AppModal>
  );
};

export default MyFilesModal;
