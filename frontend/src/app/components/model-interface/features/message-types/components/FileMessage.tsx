import React from 'react';
import { MessageAttachmentCard } from './MessageAttachmentCard';
import { resolveAttachmentKind } from './messageAttachment.utils';

interface FileMessageProps {
    fileUrl: string;
    fileName: string;
    onCopy?: (content: string) => void;
    onImagePreview?: (url: any) => void;
    setImagePreview?: (preview: any) => void;
}

export const FileMessage: React.FC<FileMessageProps> = ({
    fileUrl,
    fileName,
    onImagePreview,
    setImagePreview,
}) => {
    const kind = resolveAttachmentKind(fileName, fileUrl);
    return (
        <MessageAttachmentCard
            kind={kind}
            fileName={fileName}
            fileUrl={fileUrl}
            onPreview={(target) => {
                onImagePreview?.(target);
                setImagePreview?.(target);
            }}
            onImagePreview={(url, name, k) => {
                const target = { fileUrl: url, fileName: name || fileName, kind: k || kind };
                onImagePreview?.(target);
                setImagePreview?.(target);
            }}
        />
    );
};
