'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import type { AttachmentPreviewTarget } from './AttachmentPreviewModal';

export type ImagePreviewOpenTarget = string | AttachmentPreviewTarget;

type ImagePreviewActionsContextValue = {
    openImagePreview: (target: ImagePreviewOpenTarget) => void;
};

const ImagePreviewActionsContext = createContext<ImagePreviewActionsContextValue | null>(null);

export function ImagePreviewActionsProvider({
    children,
    setImagePreview,
}: {
    children: React.ReactNode;
    setImagePreview: (preview: ImagePreviewOpenTarget | null) => void;
}) {
    const openImagePreview = useCallback(
        (target: ImagePreviewOpenTarget) => {
            setImagePreview(target);
        },
        [setImagePreview],
    );

    const value = useMemo(
        () => ({ openImagePreview }),
        [openImagePreview],
    );

    return (
        <ImagePreviewActionsContext.Provider value={value}>
            {children}
        </ImagePreviewActionsContext.Provider>
    );
}

export function useImagePreviewActions(): ImagePreviewActionsContextValue | null {
    return useContext(ImagePreviewActionsContext);
}
