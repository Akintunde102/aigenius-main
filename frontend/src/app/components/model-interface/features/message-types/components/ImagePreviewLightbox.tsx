"use client";

import React from "react";
import {
  AttachmentPreviewModal,
  type AttachmentPreviewTarget,
} from "./AttachmentPreviewModal";

export interface ImagePreviewLightboxProps {
  imageUrl?: string | AttachmentPreviewTarget | null;
  onClose: () => void;
}

export function ImagePreviewLightbox({ imageUrl, onClose }: ImagePreviewLightboxProps) {
  if (!imageUrl) return null;
  return <AttachmentPreviewModal attachment={imageUrl} onClose={onClose} />;
}
