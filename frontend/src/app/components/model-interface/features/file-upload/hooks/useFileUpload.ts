import { customUpload } from '@/app/components/model-interface/features/file-upload/services';

export interface UploadedFileInfo {
    file: File;
    fileUrl: string;
    isImage: boolean;
}

interface UseFileUploadProps {
    setUploading: (uploading: boolean) => void;
    setUploadProgress: (progress: number | null) => void;
    setError: (error: string) => void;
    onFileUploaded: (fileInfo: UploadedFileInfo) => void;
    /** Active model-chat conversation id; sent as `conversationId` on stream upload. */
    conversationId?: string | null;
}

export function useFileUpload({
    setUploading,
    setUploadProgress,
    setError,
    onFileUploaded,
    conversationId,
}: UseFileUploadProps) {

    const handleFileUpload = (file: File) => {
        if (!file) {
            return;
        }

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
                setUploading(false);
                setUploadProgress(null);
            },
            onError: (err: any) => {
                setError("File upload failed");
                setUploading(false);
                setUploadProgress(null);
            },
            onProgress: ({ percent }: { percent: number }) => {
                setUploadProgress(percent);
            },
        });
    };

    const handleCancelUpload = () => {
        setUploading(false);
        setUploadProgress(null);
    };

    return {
        handleFileUpload,
        handleCancelUpload
    };
}
