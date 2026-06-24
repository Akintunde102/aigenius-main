import { CloudFile } from "@/app/components/file/file.interface";

const getExtensionByFileName = (fileName: string) => {
    return fileName.split('.').pop()?.toLowerCase();
}


export const getFileType = (file: CloudFile) => {
    const extension = getExtensionByFileName(file.name) || '';

    switch (extension) {
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'heic':
        case 'svg':
        case 'webp':
            return { type: 'image', extension };
        case 'mp4':
        case 'mov':
        case 'avi':
        case 'mkv':
        case 'wmv':
        case 'flv':
        case 'webm':
            return { type: 'video', extension };
        default:
            return { type: 'unknown', extension }
    }

}

export const getVideoMimeType = (extension: string) => {
    switch (extension) {
        case 'mp4':
            return 'video/mp4';
        case 'mov':
            return 'video/mp4';
        case 'avi':
            return 'video/x-msvideo';
        case 'mkv':
            return 'video/x-matroska';
        case 'wmv':
            return 'video/x-ms-wmv';
        case 'flv':
            return 'video/x-flv';
        case 'webm':
            return 'video/webm';
        default:
            return 'video/mp4';
    }
}