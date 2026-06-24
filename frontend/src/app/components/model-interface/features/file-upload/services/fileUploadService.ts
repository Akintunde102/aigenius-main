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

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

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
        const base64 = await fileToBase64(file);
        const ext = (file.name.split('.').pop() || 'wav').toLowerCase();
        return createChatMessage(
            'user',
            [
                { type: 'text', text: 'Please transcribe this audio file.' },
                { type: 'input_audio', input_audio: { data: base64, format: ext } } as any,
            ],
            selectedModel?.id,
            selectedModel?.name || selectedModel?.id
        );
    }
    // Generic file fallback stays as link
    return createChatMessage(
        'user',
        `${file.name}: ${fileUrl}`,
        selectedModel?.id,
        selectedModel?.name || selectedModel?.id
    );
};
