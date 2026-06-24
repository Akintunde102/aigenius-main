import React from 'react';
import { FiCopy, FiFile } from 'react-icons/fi';

interface FileMessageProps {
    fileUrl: string;
    fileName: string;
    onCopy: (content: string) => void;
}

export const FileMessage: React.FC<FileMessageProps> = ({ fileUrl, fileName, onCopy }) => (
    <div className="flex items-center gap-2">
        <FiFile size={16} className="text-blue-400" />
        <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700"
        >
            {fileName}
        </a>
        <button
            onClick={() => onCopy(fileUrl)}
            title="Copy file link"
            className="ml-2 text-gray-400 hover:text-blue-500"
        >
            <FiCopy size={12} />
        </button>
    </div>
);
