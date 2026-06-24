'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Loader2, AlertCircle } from 'lucide-react';

const isImageType = (file: File, isImageHint = false) => {
    if (isImageHint) return true;
    if (file.type && file.type.startsWith('image/')) return true;
    const fileName = file.name.toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some(ext => fileName.endsWith(ext));
};

export interface AttachmentPreviewProps {
    file: File;
    onRemove: () => void;
    disabled?: boolean;
    isLoading?: boolean;
    error?: string;
    isImage?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
    file,
    onRemove,
    disabled = false,
    isLoading = false,
    error,
    isImage
}) => {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const shouldTreatAsImage = isImageType(file, isImage);

    useEffect(() => {
        if (shouldTreatAsImage) {
            const url = URL.createObjectURL(file);
            setObjectUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, shouldTreatAsImage]);

    return (
        <div className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border ${error ? 'border-red-300' : 'border-gray-200'} bg-gray-50 flex items-center justify-center group`}>
            {shouldTreatAsImage && objectUrl ? (
                <>
                    <img
                        src={objectUrl}
                        alt={file.name}
                        className={`w-full h-full object-cover ${isLoading ? 'opacity-50' : ''}`}
                        loading="lazy"
                        decoding="async"
                    />
                </>
            ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center p-1 ${error ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'} rounded-lg`}>
                    {error ? (
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    ) : (
                        <FileText className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    )}
                    <span className={`text-[10px] ${error ? 'text-red-800' : 'text-amber-800'} truncate w-full text-center`} title={file.name}>
                        {file.name}
                    </span>
                </div>
            )}
            
            {/* Loading overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
            )}
            
            {/* Error overlay */}
            {error && (
                <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
            )}
            
            {/* Remove button - always visible for touch and hover */}
            <div className="absolute top-0 right-0 p-0.5">
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    className={`p-1 rounded-full ${error ? 'bg-red-500/90 hover:bg-red-600' : 'bg-red-500/90 hover:bg-red-600'} shadow-sm disabled:opacity-50`}
                    title="Remove"
                    aria-label="Remove attachment"
                >
                    <X size={10} className="text-white" />
                </button>
            </div>
        </div>
    );
};
