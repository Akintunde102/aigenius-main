"use client";

import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
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

  return (
    <AppModal
      open
      onClose={onClose}
      size="xl"
      className="z-[110]"
      mobileFullScreen={isMobile}
      closeOnEscape={false}
      ariaLabelledBy="my-files-modal-title"
    >
      <AppModalHeader
        titleId="my-files-modal-title"
        title={t("modals.myFilesTitle", "My Files")}
        subtitle={t("modals.myFilesSubtitle", "Browse, search, and manage your uploaded and generated files.")}
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
