import React, { useRef } from 'react';
import { UploadCloud, AlertTriangle } from 'lucide-react';

interface DragDropHandlerProps {
    children: React.ReactNode;
    onFilesDropped: (files: File[]) => void;
    onDragActiveChange: (active: boolean) => void;
    dragActive: boolean;
    supportsFileUpload?: boolean;
}

export function DragDropHandler({
    children,
    onFilesDropped,
    onDragActiveChange,
    dragActive,
    supportsFileUpload = true
}: DragDropHandlerProps) {
    const dragCounter = useRef(0);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
            onDragActiveChange(true);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!dragActive && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
            onDragActiveChange(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            onDragActiveChange(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        onDragActiveChange(false);
        if (!supportsFileUpload) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            onFilesDropped(files);
        }
    };

    return (
        <div
            className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}

            {dragActive ? (
                supportsFileUpload ? (
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6 bg-sky-500/10 backdrop-blur-md dark:bg-sky-500/20 transition-all duration-200">
                        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-sky-500/80 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-sky-400/90 dark:bg-slate-900/95 dark:shadow-[0_0_50px_rgba(56,189,248,0.2)]">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-500/30 bg-gradient-to-tr from-sky-500/20 to-cyan-500/20 text-sky-600 shadow-inner dark:text-sky-400">
                                <UploadCloud className="h-8 w-8 animate-bounce" aria-hidden />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
                                Drop files to upload
                            </h3>
                            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                                Release anywhere on screen to attach files or images to your message
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center p-6 bg-amber-500/10 backdrop-blur-md dark:bg-amber-500/15 transition-all duration-200">
                        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-amber-400/80 bg-white/95 p-8 text-center shadow-2xl backdrop-blur-xl dark:border-amber-500/70 dark:bg-slate-900/95 dark:shadow-[0_0_50px_rgba(245,158,11,0.15)]">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-tr from-amber-500/20 to-orange-500/20 text-amber-600 shadow-inner dark:text-amber-400">
                                <AlertTriangle className="h-8 w-8" aria-hidden />
                            </div>
                            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-xl">
                                File uploads not supported
                            </h3>
                            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                                The current model does not accept file attachments. Switch to a model that supports files or images.
                            </p>
                        </div>
                    </div>
                )
            ) : null}
        </div>
    );
}