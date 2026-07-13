import { AxiosProgressEvent } from "axios";
import { authHttp } from "@/lib/api/auth-client";
import { sendUpload, sendUploadStream } from "@/app/components/file/constants";
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { createChatMessage } from '../../chat/hooks';
import { logApiError } from '@/lib/logger';

/** Stream upload response (POST /files/upload/stream) */
export interface StreamUploadResponse {
    fileUrl: string;
    originalName?: string;
    name?: string;
    extension?: string;
    fileSizeInBytes?: number;
    /** @deprecated Use fileUrl; kept for backward compatibility */
    s3Link?: string;
}

export interface UploadCallbacks {
    onSuccess: (data: StreamUploadResponse) => void;
    onError: (error: any) => void;
    onProgress: (progress: { percent: number }) => void;
}

export const customUpload = async ({
    file,
    conversationId,
    onSuccess,
    onError,
    onProgress,
}: {
    file: File;
    /** Persisted on the upload row so “My files” can link back to `/chat/:id`. */
    conversationId?: string | null;
} & UploadCallbacks) => {
    try {
        if (!file) throw new Error("No File to upload");

        const extension = file?.name?.split(".")?.pop()?.toLowerCase() || "unknown";
        const mimeTypes: Record<string, string> = {
            "env": "text/plain",
            "txt": "text/plain",
            "csv": "text/csv",
            "json": "application/json",
            "md": "text/markdown",
            "xml": "application/xml",
            // Audio extensions
            "mp3": "audio/mpeg",
            "wav": "audio/wav",
            "ogg": "audio/ogg",
            "m4a": "audio/m4a",
            "aac": "audio/aac",
            "flac": "audio/flac",
            "webm": "audio/webm",
            "mp4": "audio/mp4",
            "unknown": "application/octet-stream",
        };

        const params = new URLSearchParams({ fileName: file.name });
        if (conversationId && /^[0-9a-f-]{36}$/i.test(conversationId.trim())) {
            params.set("conversationId", conversationId.trim());
        }
        const link = `${sendUploadStream}?${params.toString()}`;

        const response = await authHttp.post(
            link,
            file,
            {
                headers: {
                    'Content-Type': file.type || mimeTypes[extension],
                },
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const val = (progressEvent.loaded / (progressEvent.total || progressEvent.loaded));
                    const percent = Math.floor(val * 100);
                    onProgress({ percent });
                },
            });


        const data = response.data as StreamUploadResponse;
        onSuccess(data);
    } catch (error) {
        logApiError(error, 'file-upload', 'POST');
        onError(error);
    }
};

/** @param fileUrl - URL of the uploaded file (from response.fileUrl or legacy s3Link) */
export const createFileMessageAsync = async (file: File, fileUrl: string, selectedModel: any): Promise<ChatMessage> => {
    if (file.type.startsWith('image/')) {
        return createChatMessage(
            'user',
            [{ type: 'image_url', image_url: { url: fileUrl } }],
            selectedModel?.id,
            selectedModel?.name || selectedModel?.id
        );
    }
    if (file.type.startsWith('audio/')) {
        return createChatMessage(
            'user',
            [{
                type: 'file_url',
                file_url: { url: fileUrl, name: file.name },
            }],
            selectedModel?.id,
            selectedModel?.name || selectedModel?.id
        );
    }
    return createChatMessage(
        'user',
        [{
            type: 'file_url',
            file_url: { url: fileUrl, name: file.name },
        }],
        selectedModel?.id,
        selectedModel?.name || selectedModel?.id
    );
};
