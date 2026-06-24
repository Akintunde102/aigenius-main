import React from 'react';
import { ModelSelectorProps } from './types';

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedModel,
    onModelChange,
    onModelNameClick,
    disabled,
    uploading,
    isDropdownOpen,
    setIsDropdownOpen
}) => {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => onModelNameClick && onModelNameClick()}
                disabled={disabled || uploading}
                className="flex items-center space-x-2 px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-200"
            >
                <span className="text-xs font-medium">
                    {selectedModel?.name ?? "Select model"}
                </span>
            </button>
        </div>
    );
}; 