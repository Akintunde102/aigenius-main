"use client";

import React from "react";
import {
  AttachmentPreviewModal,
  type AttachmentPreviewTarget,
} from "./AttachmentPreviewModal";
import { ImageAnnotatorLightbox } from "./ImageAnnotatorLightbox";
import { isImagePreviewTarget } from "./imageAnnotator.utils";

import type { CloudFile } from "@/app/components/file/file.interface";

export interface ImagePreviewLightboxProps {
  imageUrl?: string | AttachmentPreviewTarget | null;
  onClose: () => void;
  onSavedToUploads?: (savedFile: CloudFile) => void;
}

export function ImagePreviewLightbox({ imageUrl, onClose, onSavedToUploads }: ImagePreviewLightboxProps) {
  if (!imageUrl) return null;
  if (isImagePreviewTarget(imageUrl)) {
    return <ImageAnnotatorLightbox attachment={imageUrl} onClose={onClose} onSavedToUploads={onSavedToUploads} />;
  }
  return <AttachmentPreviewModal attachment={imageUrl} onClose={onClose} />;
}
