'use client';
import { getUploadedFiles, sendUploadStream } from "./constants";
import useFileContext from "./FileContext";
import { CloudFile } from "./file.interface";
import { AxiosProgressEvent } from "axios";
import { useEffect, useRef } from "react";
import { authHttp } from "@/lib/api/auth-client";

interface FileHook {
    getFiles: () => CloudFile[],
    total: number,
    upload: (option: any) => void
}

export function useFiles(folderId?: string, userId?: string): FileHook {

    const { toast, uploaded, setUploaded } = useFileContext();

    const hasFetchedData = useRef(false);


    async function loadUserFiles(shouldToast = false) {
        try {

            const link = getUploadedFiles({ folderId, userId });
            const response = await authHttp.get(link);

            if (response.status !== 200) {
                if (shouldToast) {
                    toast.error(`Could not fetch all your uploaded files.`);
                }
                return
            }

            setUploaded(() => {
                return response.data || [];
            });


        } catch (error) {
            toast.error(`Could not fetch all your uploaded files.`);
        }
    }


    useEffect(() => {

        if (!hasFetchedData.current) {  // Only fetch data if it hasn't been fetched yet
            loadUserFiles(true)
            hasFetchedData.current = true; // Mark as fetched
        }
    }, [loadUserFiles]);


    const reload = async () => {
        await loadUserFiles();
    }

    const upload = async (options: {
        onSuccess: (data: any[]) => void,
        onError: (error: any) => void,
        file: File,
        onProgress: (progress: { percent: number }) => void;
    }) => {
        const { onSuccess, onError, file, onProgress } = options;

        try {

            if (!file) {
                throw new Error("No File to upload");
            }

            const link = folderId
                ? `${sendUploadStream}?fileName=${file.name}&folderId=${folderId}`
                : `${sendUploadStream}?fileName=${file.name}`;

            const extension = file?.name?.split(".")?.pop()?.toLowerCase() || "unknown";
            const mimeTypes: Record<string, string> = {
                "env": "text/plain",
                "txt": "text/plain",
                "csv": "text/csv",
                "json": "application/json",
                "md": "text/markdown",
                "xml": "application/xml",
                "unknown": "application/octet-stream",
            };

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

            const data: any[] = response.data.data;
            onSuccess(data);
            reload();

            toast.success(`${file.name} file uploaded successfully`);
        } catch (error) {
            onError(error);
            toast.error(`${file.name} file upload failed.`);
        }
    };

    return {
        getFiles: () => uploaded,
        total: uploaded.length,
        upload
    }
}
