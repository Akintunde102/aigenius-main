import React from 'react';
import { UploadProgressBarProps } from './types';

interface EnhancedUploadProgressBarProps extends UploadProgressBarProps {
    sidebarStyle?: boolean;
}

export const UploadProgressBar: React.FC<EnhancedUploadProgressBarProps> = ({
    uploading,
    uploadProgress,
    sidebarStyle = false
}) => {
    if (!uploading || uploadProgress === null) {
        return null;
    }

    return (
        <div className={`w-full h-0.5 rounded-full ${sidebarStyle ? 'bg-[#E6E8F9]' : 'bg-gray-200'}`}>
            <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${sidebarStyle ? 'bg-gradient-to-r from-[#496080] to-[#3B4A6B]' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`}
                style={{ width: `${uploadProgress}%` }}
            />
        </div>
    );
}; 