import { sendUpload } from "@/app/components/file/constants";
import { AxiosProgressEvent } from "axios";
import toast from "react-hot-toast";
import _ from "lodash";
import { CloudFile } from "@/app/components/file/file.interface";
import { logger } from '@/lib/logger';
import { authHttp } from '@/lib/api/auth-client';

export const uploadFile = async (options: {
    onSuccess: (data: CloudFile) => void,
    onError: (error: any) => void,
    file: File,
    onProgress: (progress: { percent: number }) => void;
}) => {
    const { onSuccess, onError, file, onProgress } = options;

    const formData = new FormData();
    formData.append('file', file);



    logger.debug('File upload initiated', {
        feature: 'file-upload',
        action: 'form_data_created',
        metadata: {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
        }
    });

    try {

        if (!file) {
            throw new Error("No File to upload");
        }

        const uploadUrl = `${sendUpload}?fileName=${file.name}`;

        const response = await authHttp.post(
            uploadUrl,
            formData,
            {
                headers: {
                    // 'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent: AxiosProgressEvent) => {
                    const val = (progressEvent.loaded / (progressEvent.total || progressEvent.loaded));
                    const percent = Math.floor(val * 100);
                    onProgress({ percent });
                },
            }
        );

        const data = response.data;
        onSuccess(data);
        toast.success(`${file.name} file uploaded successfully`);
    } catch (error) {
        onError(error);
        toast.error(`${file.name} file upload failed.`);
    }
};
