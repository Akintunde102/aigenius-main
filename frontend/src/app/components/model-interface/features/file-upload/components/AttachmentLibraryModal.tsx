"use client";

import React, { useEffect, useState } from "react";
import { UserFilesBrowser } from "@/app/components/user-files/UserFilesBrowser";
import type { UploadedFilesLibraryState } from "@/app/components/user-files/useUploadedFilesList";
import type { CloudFile } from "@/app/components/file/file.interface";
import { AppModal, AppModalHeader } from "@/app/components/modals/AppModal";

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
      ? `${filesCount} files · Select uploaded files to attach to your prompt`
      : "Select uploaded files to attach to your prompt";

  return (
    <AppModal
      open
      onClose={onClose}
      size="tall"
      mobileFullScreen={isMobile}
      closeOnEscape={false}
      ariaLabelledBy="attachment-library-title"
      panelClassName="!max-h-[min(90vh,720px)]"
    >
      <AppModalHeader
        titleId="attachment-library-title"
        title="Choose from My files"
        subtitle={subtitle}
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
