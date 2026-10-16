"use client";

import React from "react";
import { FiHardDrive, FiUploadCloud } from "react-icons/fi";
import { AppModal, AppModalHeader, AppModalBody } from "@/app/components/modals/AppModal";

export interface AttachmentSourcePickerModalProps {
  onClose: () => void;
  onPickLocal: () => void;
  onPickLibrary: () => void;
}

export function AttachmentSourcePickerModal({
  onClose,
  onPickLocal,
  onPickLibrary,
}: AttachmentSourcePickerModalProps) {
  return (
    <AppModal
      open
      onClose={onClose}
      size="sm"
      ariaLabelledBy="attachment-source-title"
      className="z-[110]"
    >
      <AppModalHeader
        titleId="attachment-source-title"
        title="Add attachment"
        subtitle="Choose a source for your file"
        onClose={onClose}
      />

      <AppModalBody className="!py-2.5">
        <div className="grid gap-2">
          <button
            type="button"
            onClick={onPickLocal}
            className="group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
            style={{
              borderColor: "var(--modal-border)",
              background: "color-mix(in srgb, var(--modal-fg) 2%, var(--modal-bg))",
            }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{
                background: "color-mix(in srgb, var(--chat-accent) 12%, transparent)",
                color: "var(--chat-accent)",
              }}
            >
              <FiHardDrive size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold" style={{ color: "var(--modal-fg)" }}>
                From this device
              </span>
              <span className="block text-[11px] truncate" style={{ color: "var(--modal-muted-fg)" }}>
                Browse files on your computer or phone
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onPickLibrary}
            className="group flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors hover:bg-[var(--surface-muted)]"
            style={{
              borderColor: "var(--modal-border)",
              background: "color-mix(in srgb, var(--modal-fg) 2%, var(--modal-bg))",
            }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{
                background: "color-mix(in srgb, #10b981 12%, transparent)",
                color: "#10b981",
              }}
            >
              <FiUploadCloud size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold" style={{ color: "var(--modal-fg)" }}>
                From My files
              </span>
              <span className="block text-[11px] truncate" style={{ color: "var(--modal-muted-fg)" }}>
                Reuse files you have already uploaded
              </span>
            </span>
          </button>
        </div>
      </AppModalBody>
    </AppModal>
  );
}
