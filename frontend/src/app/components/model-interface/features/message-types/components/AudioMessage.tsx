import React from 'react';
import { MessageAttachmentCard } from './MessageAttachmentCard';

interface AudioMessageProps {
    fileUrl: string;
    fileName?: string;
    onCopy?: (content: string) => void;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({
    fileUrl,
    fileName = 'audio',
}) => (
    <MessageAttachmentCard
        kind="audio"
        fileName={fileName}
        fileUrl={fileUrl}
    />
);
