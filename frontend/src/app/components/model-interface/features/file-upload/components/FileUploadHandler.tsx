import React, { useRef, useEffect } from 'react';
import { customUpload, createFileMessageAsync } from '@/app/components/model-interface/features/file-upload/services';
import { Model, ChatMessage } from '@/app/components/model-interface/shared/types';

interface FileUploadHandlerProps {
    onFileUpload: (file: File) => void;
    onUploadingChange: (uploading: boolean) => void;
    onUploadProgressChange: (progress: number | null) => void;
    onError: (error: string) => void;
    onChatUpdate: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
    selectedModel: Model | null;
    chatEndRef: React.RefObject<HTMLDivElement>;
}

export function FileUploadHandler({
    onFileUpload,
    onUploadingChange,
    onUploadProgressChange,
    onError,
    onChatUpdate,
    selectedModel,
    chatEndRef
}: FileUploadHandlerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (file: File) => {
        if (!file) return;
        onUploadingChange(true);
        onUploadProgressChange(0);

        customUpload({
            file,
            onSuccess: (data: { fileUrl?: string; s3Link?: string }) => {
                const uploaded = data;

                const fileUrl = uploaded?.fileUrl ?? uploaded?.s3Link;
                if (fileUrl) {
                    (async () => {
                        const userMsg = await createFileMessageAsync(file, fileUrl, selectedModel);
                        onChatUpdate(prev => {
                            const updated = [...prev, userMsg];
                            setTimeout(() => {
                                const area = (chatEndRef.current?.parentElement as HTMLElement | null);
                                const isNearBottom = area ? (area.scrollHeight - area.scrollTop - area.clientHeight < 60) : true;
                                if (isNearBottom && chatEndRef.current) {
                                    chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
                                }
                            }, 100);
                            return updated;
                        });
                    })();
                }
                onUploadingChange(false);
                onUploadProgressChange(null);
            },
            onError: () => {
                onError("File upload failed");
                onUploadingChange(false);
                onUploadProgressChange(null);
            },
            onProgress: ({ percent }: { percent: number }) => {
                onUploadProgressChange(percent);
            },
        });
    };

    // Paste handler
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length > 0) {
                handleFileUpload(e.clipboardData.files[0]);
            }
        };
        window.addEventListener("paste", handlePaste);
        return () => window.removeEventListener("paste", handlePaste);
    }, []);

    // File input handlers
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
            e.target.value = ""; // reset input
        }
    };

    return (
        <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
        />
    );
} 
