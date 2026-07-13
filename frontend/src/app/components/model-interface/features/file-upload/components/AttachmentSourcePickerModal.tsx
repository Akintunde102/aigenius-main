"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiHardDrive, FiUploadCloud, FiX } from "react-icons/fi";

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
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
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
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="attachment-source-title"
          className={`w-full max-w-md overflow-hidden rounded-xl border shadow-2xl ${
            isMobile ? "mx-2" : ""
          }`}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "var(--modal-bg)",
            borderColor: "var(--modal-border)",
            color: "var(--modal-fg)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "var(--modal-border)" }}
          >
            <h2 id="attachment-source-title" className="text-base font-semibold">
              Add attachment
            </h2>
            <button
              type="button"
              aria-label="Close"
              className="rounded p-1 transition hover:text-red-500"
              style={{ color: "var(--modal-muted-fg)" }}
              onClick={onClose}
            >
              <FiX size={20} />
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <button
              type="button"
              onClick={onPickLocal}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: "var(--modal-border)" }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                <FiHardDrive size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">From this device</span>
                <span className="block text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                  Browse files on your computer or phone
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={onPickLibrary}
              className="flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: "var(--modal-border)" }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <FiUploadCloud size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold">From My files</span>
                <span className="block text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                  Reuse files you have already uploaded
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    ) as any,
    portalTarget,
  );
}
