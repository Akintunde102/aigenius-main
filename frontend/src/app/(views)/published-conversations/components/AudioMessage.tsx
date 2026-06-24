import React from 'react';
import { FiCopy } from 'react-icons/fi';

interface AudioMessageProps {
    fileUrl: string;
    onCopy: (content: string) => void;
}

export const AudioMessage: React.FC<AudioMessageProps> = ({ fileUrl, onCopy }) => (
    <div className="flex items-center gap-2">
        <audio controls src={fileUrl} style={{ maxWidth: '100%' }} />
        <button
            onClick={() => onCopy(fileUrl)}
            title="Copy audio link"
            className="ml-2 text-gray-400 hover:text-blue-500"
        >
            <FiCopy size={12} />
        </button>
    </div>
);
