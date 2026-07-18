import React from 'react';
import { MessageAttachmentCard } from './MessageAttachmentCard';
import { resolveAttachmentKind } from './messageAttachment.utils';

interface FileMessageProps {
    fileUrl: string;
    fileName: string;
    onCopy?: (content: string) => void;
}

export const FileMessage: React.FC<FileMessageProps> = ({ fileUrl, fileName }) => (
    <MessageAttachmentCard
        kind={resolveAttachmentKind(fileName, fileUrl)}
        fileName={fileName}
        fileUrl={fileUrl}
    />
);
