import React from 'react';

interface DragDropHandlerProps {
    children: React.ReactNode;
    onFilesDropped: (files: File[]) => void;
    onDragActiveChange: (active: boolean) => void;
    dragActive: boolean;
}

export function DragDropHandler({
    children,
    onFilesDropped,
    onDragActiveChange,
    dragActive
}: DragDropHandlerProps) {
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onDragActiveChange(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onDragActiveChange(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onDragActiveChange(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            onFilesDropped(files);
        }
    };

    return (
        <div
            className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col ${dragActive ? 'bg-blue-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}
        </div>
    );
} 