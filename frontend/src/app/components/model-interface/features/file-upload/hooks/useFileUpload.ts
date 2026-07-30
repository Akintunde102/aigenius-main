import { customUpload } from '@/app/components/model-interface/features/file-upload/services';

export interface UploadedFileInfo {
    file: File;
    fileUrl: string;
    isImage: boolean;
}

export interface ActiveUploadEntry {
    fileId: string;
    fileName: string;
    progress: number;
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

export function useFileUpload({
    setUploading,
    setUploadProgress,
    setError,
    onFileUploaded,
    conversationId,
    onActiveUploadsChange,
}: UseFileUploadProps) {

    // Keep callback reference up to date
    activeUploadsChangeCallback = onActiveUploadsChange ?? null;

    const handleFileUpload = (file: File) => {
        if (!file) {
            return;
        }

        const fileId = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Track this upload in the active map
        activeUploadsMap.set(fileId, { fileId, fileName: file.name, progress: 0 });
        notifyActiveUploads();

        // Set global uploading to true (at least one upload is active)
        setUploading(true);
        setUploadProgress(0);

        customUpload({
            file,
            conversationId: conversationId ?? undefined,
            onSuccess: (data: any) => {
                const uploaded = data;
                const fileUrl = uploaded?.fileUrl ?? uploaded?.s3Link;
                if (fileUrl) {
                    onFileUploaded({
                        file,
                        fileUrl,
                        isImage: file.type.startsWith('image/')
                    });
                }
                activeUploadsMap.delete(fileId);
                notifyActiveUploads();
                if (activeUploadsMap.size === 0) {
                    setUploading(false);
                    setUploadProgress(null);
                } else {
                    // Compute aggregate progress
                    const entries = Array.from(activeUploadsMap.values());
                    const avg = entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
                    setUploadProgress(Math.round(avg));
                }
            },
            onError: (err: any) => {
                setError(`Upload failed: ${file.name}`);
                activeUploadsMap.delete(fileId);
                notifyActiveUploads();
                if (activeUploadsMap.size === 0) {
                    setUploading(false);
                    setUploadProgress(null);
                }
            },
            onProgress: ({ percent }: { percent: number }) => {
                const entry = activeUploadsMap.get(fileId);
                if (entry) {
                    entry.progress = percent;
                    activeUploadsMap.set(fileId, entry);
                    notifyActiveUploads();
                }
                // Compute aggregate progress for the global bar
                const entries = Array.from(activeUploadsMap.values());
                const avg = entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
                setUploadProgress(Math.round(avg));
            },
        });
    };

    const handleCancelUpload = () => {
        activeUploadsMap.clear();
        notifyActiveUploads();
        setUploading(false);
        setUploadProgress(null);
    };

    return {
        handleFileUpload,
        handleCancelUpload
    };
}
