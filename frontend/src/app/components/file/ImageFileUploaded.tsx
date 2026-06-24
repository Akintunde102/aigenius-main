'use client';
import { useFiles } from "./useFiles";
import { ImageFileTemplate } from "./ImageFileTemplate";


export default function FileUploaded({ folderId, userId }: { folderId?: string, userId?: string }) {

    const { getFiles } = useFiles(folderId, userId);

    const uploadedFiles = getFiles();

    return (
        <ImageFileTemplate uploadedFiles={uploadedFiles} />
    )
}