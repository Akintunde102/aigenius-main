import { useRef, useCallback, useEffect, useMemo, useState } from 'react';

const FILE_VALIDATION = {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'text/plain', 'text/csv', 'application/json', 'text/markdown',
        'application/pdf', 'application/xml',
        // Audio
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
        'audio/m4a', 'audio/aac', 'audio/flac', 'audio/x-flac', 'audio/mp4'
    ]
};

interface UseFileUploadProps {
    onFileUpload?: (file: File) => void;
    onCancelUpload?: () => void;
    onAttachmentMenuRequest?: () => void;
    uploading?: boolean;
    disabled?: boolean;
    supportsFileUpload?: boolean;
}

interface UploadItem {
    id: string;
    file: File;
    previewUrl?: string;
    isImage: boolean;
}

interface PendingFile extends UploadItem {
    status: 'uploading' | 'queued';
}

export const useFileUpload = ({
    onFileUpload,
    onCancelUpload,
    onAttachmentMenuRequest,
    uploading = false,
    disabled = false,
    supportsFileUpload = true
}: UseFileUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [currentItem, setCurrentItem] = useState<UploadItem | null>(null);
    const [queuedItems, setQueuedItems] = useState<UploadItem[]>([]);
    const uploadStartedRef = useRef(false);

    const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
        if (file.size > FILE_VALIDATION.maxSize) {
            return { isValid: false, error: 'File too large. Maximum size is 10MB.' };
        }

        if (!FILE_VALIDATION.allowedTypes.includes(file.type)) {
            return { isValid: false, error: `File type not supported: ${file.type}` };
        }

        return { isValid: true };
    }, []);

    const resetFileInfo = useCallback(() => {
        // File info reset logic if needed in the future
    }, []);

    const createUploadItem = useCallback((file: File): UploadItem => {
        const isImage = file.type.startsWith('image/');
        return {
            id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
            file,
            isImage,
            previewUrl: isImage ? URL.createObjectURL(file) : undefined
        };
    }, []);

    const revokePreview = useCallback((item: UploadItem) => {
        if (item.previewUrl) {
            URL.revokeObjectURL(item.previewUrl);
        }
    }, []);

    const queueFiles = useCallback((files: File[]) => {
        if (!supportsFileUpload || disabled || !onFileUpload) {
            return;
        }

        const validItems: UploadItem[] = [];
        const errors: string[] = [];

        files.forEach((file) => {
            const validation = validateFile(file);
            if (!validation.isValid) {
                if (validation.error) {
                    errors.push(validation.error);
                }
                return;
            }
            validItems.push(createUploadItem(file));
        });

        if (errors.length > 0) {
            // TODO: Replace with toast once available
            alert(errors[0]);
        }

        if (validItems.length > 0) {
            setQueuedItems((prev) => [...prev, ...validItems]);
        }
    }, [supportsFileUpload, disabled, onFileUpload, validateFile, createUploadItem]);

    const startNextUpload = useCallback(() => {
        if (disabled || uploading || !onFileUpload) {
            return;
        }

        if (!currentItem && queuedItems.length > 0) {
            const [nextItem, ...rest] = queuedItems;
            setQueuedItems(rest);
            setCurrentItem(nextItem);
            uploadStartedRef.current = false;
            onFileUpload(nextItem.file);
        }
    }, [disabled, uploading, onFileUpload, currentItem, queuedItems]);

    useEffect(() => {
        if (uploading && currentItem) {
            uploadStartedRef.current = true;
        }

        if (!uploading && currentItem && uploadStartedRef.current) {
            revokePreview(currentItem);
            setCurrentItem(null);
            uploadStartedRef.current = false;
        }

        if (!uploading && !currentItem) {
            startNextUpload();
        }
    }, [uploading, currentItem, startNextUpload, revokePreview]);

    useEffect(() => {
        return () => {
            if (currentItem) {
                revokePreview(currentItem);
            }
            queuedItems.forEach(revokePreview);
        };
    }, [currentItem, queuedItems, revokePreview]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        // Read files first: in some browsers, clearing the input clears the FileList
        const files = Array.from(e.target.files ?? []);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (files.length === 0) return;
        queueFiles(files);
    }, [queueFiles]);

    const handleAttachmentClick = useCallback(() => {
        if (!supportsFileUpload || disabled || !onFileUpload) {
            return;
        }

        if (onAttachmentMenuRequest) {
            onAttachmentMenuRequest();
            return;
        }

        // Must be synchronous: browsers require file dialog to be triggered directly from user gesture.
        // Using setTimeout breaks the gesture chain and causes upload to silently fail.
        fileInputRef.current?.click();
    }, [supportsFileUpload, disabled, onFileUpload, onAttachmentMenuRequest]);

    const openLocalFilePicker = useCallback(() => {
        if (!supportsFileUpload || disabled || !onFileUpload) {
            return;
        }
        fileInputRef.current?.click();
    }, [supportsFileUpload, disabled, onFileUpload]);

    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        if (!onFileUpload || !supportsFileUpload || disabled) return;

        // Handle clipboard files
        if (e.clipboardData?.files?.length > 0) {
            const files = Array.from(e.clipboardData.files);
            queueFiles(files);
            e.preventDefault();
            return;
        }

        // Handle clipboard items (for images)
        if (e.clipboardData?.items) {
            const imageFiles: File[] = [];
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        imageFiles.push(file);
                    }
                }
            }
            if (imageFiles.length > 0) {
                queueFiles(imageFiles);
                e.preventDefault();
            }
        }
    }, [onFileUpload, supportsFileUpload, disabled, queueFiles]);

    const pendingFiles = useMemo<PendingFile[]>(() => {
        const items: PendingFile[] = [];
        if (currentItem) {
            items.push({ ...currentItem, status: 'uploading' });
        }
        queuedItems.forEach((item) => items.push({ ...item, status: 'queued' }));
        return items;
    }, [currentItem, queuedItems]);

    const removePendingFile = useCallback((id: string) => {
        if (currentItem?.id === id) {
            revokePreview(currentItem);
            setCurrentItem(null);
            uploadStartedRef.current = false;
            onCancelUpload?.();
        }
        setQueuedItems((prev) => {
            const item = prev.find((i) => i.id === id);
            if (item) revokePreview(item);
            return prev.filter((i) => i.id !== id);
        });
    }, [currentItem, revokePreview, onCancelUpload]);

    return {
        fileInputRef,
        handleFileInputChange,
        handleAttachmentClick,
        handlePaste,
        resetFileInfo,
        FILE_VALIDATION,
        validateFile,
        pendingFiles,
        queueFiles,
        removePendingFile,
        openLocalFilePicker,
    };
};