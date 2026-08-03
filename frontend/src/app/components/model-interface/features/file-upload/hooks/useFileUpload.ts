import { useCallback, useState } from 'react';
import { customUpload } from '@/app/components/model-interface/features/file-upload/services';

export interface UploadedFileInfo {
    file: File;
    fileUrl: string;
    isImage: boolean;
}

export type FailedUploadStatus = 'failed' | 'retrying';

export interface FailedUploadEntry {
    id: string;
    file: File;
    status: FailedUploadStatus;
    progress?: number;
}

export interface ActiveUploadEntry {
    fileId: string;
    file: File;
    fileName: string;
    progress: number;
    cancel: () => void;
    failedEntryId?: string;
}

interface UseFileUploadProps {
    setUploading: (uploading: boolean) => void;
    setUploadProgress: (progress: number | null) => void;
    setError: (error: string) => void;
    onFileUploaded: (fileInfo: UploadedFileInfo) => void;
    /** Active model-chat conversation id; sent as `conversationId` on stream upload. */
    conversationId?: string | null;
    /** Callback invoked whenever per-file progress map changes */
    onActiveUploadsChange?: (uploads: Map<string, ActiveUploadEntry>) => void;
}

// Module-level map to track concurrent uploads
let activeUploadsMap = new Map<string, ActiveUploadEntry>();
let activeUploadsChangeCallback: ((uploads: Map<string, ActiveUploadEntry>) => void) | null = null;

function notifyActiveUploads() {
    activeUploadsChangeCallback?.(new Map(activeUploadsMap));
}

function syncAggregateProgress(
    setUploadProgress: (progress: number | null) => void,
    setUploading: (uploading: boolean) => void,
) {
    if (activeUploadsMap.size === 0) {
        setUploading(false);
        setUploadProgress(null);
        return;
    }

    setUploading(true);
    const entries = Array.from(activeUploadsMap.values());
    const avg = entries.reduce((sum, entry) => sum + entry.progress, 0) / entries.length;
    setUploadProgress(Math.round(avg));
}

export function useFileUpload({
    setUploading,
    setUploadProgress,
    setError,
    onFileUploaded,
    conversationId,
    onActiveUploadsChange,
}: UseFileUploadProps) {
    const [failedUploads, setFailedUploads] = useState<FailedUploadEntry[]>([]);

    // Keep callback reference up to date
    activeUploadsChangeCallback = onActiveUploadsChange ?? null;

    const handleFileUpload = useCallback((file: File, options?: { failedEntryId?: string }) => {
        if (!file) {
            return;
        }

        const failedEntryId = options?.failedEntryId;
        const fileId = failedEntryId ?? `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        if (failedEntryId) {
            setFailedUploads((prev) =>
                prev.map((entry) =>
                    entry.id === failedEntryId
                        ? { ...entry, status: 'retrying', progress: 0 }
                        : entry,
                ),
            );
        }

        setUploading(true);
        setUploadProgress(0);

        customUpload({
            file,
            conversationId: conversationId ?? undefined,
            onStarted: ({ cancel }) => {
                activeUploadsMap.set(fileId, {
                    fileId,
                    file,
                    fileName: file.name,
                    progress: 0,
                    cancel,
                    failedEntryId,
                });
                notifyActiveUploads();
            },
            onSuccess: (data) => {
                const uploaded = data;
                const fileUrl = uploaded?.fileUrl ?? uploaded?.s3Link;
                if (fileUrl) {
                    onFileUploaded({
                        file,
                        fileUrl,
                        isImage: file.type.startsWith('image/'),
                    });
                }
                if (failedEntryId) {
                    setFailedUploads((prev) => prev.filter((entry) => entry.id !== failedEntryId));
                } else {
                    setFailedUploads((prev) => prev.filter((entry) => entry.file !== file));
                }
                activeUploadsMap.delete(fileId);
                notifyActiveUploads();
                syncAggregateProgress(setUploadProgress, setUploading);
            },
            onError: () => {
                setError(`Upload failed: ${file.name}`);
                if (failedEntryId) {
                    setFailedUploads((prev) =>
                        prev.map((entry) =>
                            entry.id === failedEntryId
                                ? { ...entry, status: 'failed', progress: undefined }
                                : entry,
                        ),
                    );
                } else {
                    setFailedUploads((prev) => {
                        if (prev.some((entry) => entry.file === file)) {
                            return prev;
                        }
                        return [...prev, { id: fileId, file, status: 'failed' }];
                    });
                }
                activeUploadsMap.delete(fileId);
                notifyActiveUploads();
                syncAggregateProgress(setUploadProgress, setUploading);
            },
            onProgress: ({ percent }) => {
                const entry = activeUploadsMap.get(fileId);
                if (!entry) {
                    return;
                }

                entry.progress = percent;
                activeUploadsMap.set(fileId, entry);
                notifyActiveUploads();

                if (failedEntryId) {
                    setFailedUploads((prev) =>
                        prev.map((failedEntry) =>
                            failedEntry.id === failedEntryId
                                ? { ...failedEntry, status: 'retrying', progress: percent }
                                : failedEntry,
                        ),
                    );
                }

                const entries = Array.from(activeUploadsMap.values());
                const avg = entries.reduce((sum, activeEntry) => sum + activeEntry.progress, 0) / entries.length;
                setUploadProgress(Math.round(avg));
            },
        });
    }, [
        conversationId,
        onFileUploaded,
        setError,
        setUploadProgress,
        setUploading,
    ]);

    const handleCancelUpload = useCallback((file?: File) => {
        const entries = file
            ? Array.from(activeUploadsMap.values()).filter((entry) => entry.file === file)
            : Array.from(activeUploadsMap.values());

        entries.forEach((entry) => {
            entry.cancel();
            if (entry.failedEntryId) {
                setFailedUploads((prev) => prev.filter((failedEntry) => failedEntry.id !== entry.failedEntryId));
            }
            activeUploadsMap.delete(entry.fileId);
        });

        notifyActiveUploads();
        syncAggregateProgress(setUploadProgress, setUploading);
    }, [setUploadProgress, setUploading]);

    const retryFailedUpload = useCallback((id: string) => {
        const entry = failedUploads.find((item) => item.id === id);
        if (!entry || entry.status === 'retrying') {
            return;
        }
        handleFileUpload(entry.file, { failedEntryId: id });
    }, [failedUploads, handleFileUpload]);

    const retryAllFailedUploads = useCallback(() => {
        const copies = failedUploads.filter((entry) => entry.status !== 'retrying');
        if (copies.length === 0) {
            return;
        }
        copies.forEach((entry) => handleFileUpload(entry.file, { failedEntryId: entry.id }));
    }, [failedUploads, handleFileUpload]);

    const removeFailedUpload = useCallback((id: string) => {
        const entry = failedUploads.find((item) => item.id === id);
        if (entry?.status === 'retrying') {
            handleCancelUpload(entry.file);
            return;
        }
        setFailedUploads((prev) => prev.filter((failedEntry) => failedEntry.id !== id));
    }, [failedUploads, handleCancelUpload]);

    return {
        handleFileUpload,
        handleCancelUpload,
        failedUploads,
        retryFailedUpload,
        retryAllFailedUploads,
        removeFailedUpload,
    };
}
