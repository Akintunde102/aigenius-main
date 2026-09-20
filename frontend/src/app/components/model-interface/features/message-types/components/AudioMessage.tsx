import React from 'react';
import { MessageAttachmentCard } from './MessageAttachmentCard';

interface AudioMessageProps {
    fileUrl: string;
    fileName?: string;
    onCopy?: (content: string) => void;
    onImagePreview?: (url: any) => void;
    setImagePreview?: (preview: any) => void;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({
    fileUrl,
    fileName = 'audio',
    onImagePreview,
    setImagePreview,
}) => (
    <MessageAttachmentCard
        kind="audio"
        fileName={fileName}
        fileUrl={fileUrl}
        onPreview={(target) => {
            onImagePreview?.(target);
            setImagePreview?.(target);
        }}
        onImagePreview={(url, name) => {
            const target = { fileUrl: url, fileName: name || fileName, kind: 'audio' as const };
            onImagePreview?.(target);
            setImagePreview?.(target);
        }}
    />
);
