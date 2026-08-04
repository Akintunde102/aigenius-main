"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";

export interface ImagePreviewLightboxProps {
  imageUrl: string;
  onClose: () => void;
}

export function ImagePreviewLightbox({ imageUrl, onClose }: ImagePreviewLightboxProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
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
        role="dialog"
        aria-modal="true"
        aria-label="Image preview"
        className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <button
          type="button"
          aria-label="Close preview"
          className="absolute right-4 top-4 z-[10001] rounded-full bg-white/15 p-2.5 text-white ring-1 ring-white/30 transition hover:bg-white/25"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
        >
          <FiX size={22} aria-hidden />
        </button>

        <div
          className="max-h-[90vh] max-w-[min(96vw,1200px)] overflow-hidden rounded-xl shadow-2xl ring-2 ring-white/15"
          onClick={(event) => event.stopPropagation()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Preview"
            className="max-h-[85vh] w-auto max-w-full object-contain"
            decoding="async"
          />
        </div>
      </div>
    ) as React.ReactNode,
    portalTarget,
  );
}
