import React from 'react';
import { FiLoader } from 'react-icons/fi';

interface ConfirmationModalProps {
    isOpen: boolean;
    isProcessing: boolean;
    title: string;
    processingTitle: string;
    confirmText: string;
    processingText: string;
    confirmButtonColor: 'red' | 'yellow' | 'gray';
    onConfirm: () => void;
    onCancel: () => void;
}

const buttonColorClasses = {
    red: 'bg-red-500 text-white hover:bg-red-600',
    yellow: 'bg-yellow-500 text-white hover:bg-yellow-600',
    gray: 'bg-gray-400 text-white hover:bg-gray-500'
};

const spinnerColorClasses = {
    red: 'border-red-200 border-t-red-500',
    yellow: 'border-yellow-200 border-t-yellow-500',
    gray: 'border-gray-200 border-t-gray-500'
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    isProcessing,
    title,
    processingTitle,
    confirmText,
    processingText,
    confirmButtonColor,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-40"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isProcessing) {
                    onCancel();
                }
            }}
        >
            <div
                className={`rounded-lg shadow-lg p-6 w-80 max-w-full relative border ${isProcessing ? 'pointer-events-none' : ''}`}
                style={{
                    background: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                }}
            >
                {isProcessing && (
                    <div
                        className="absolute inset-0 rounded-lg flex items-center justify-center z-10"
                        style={{ background: "var(--modal-bg)", opacity: 0.95 }}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-8 h-8 border-4 ${spinnerColorClasses[confirmButtonColor]} rounded-full animate-spin`}></div>
                            <span className="font-medium" style={{ color: "var(--modal-fg)" }}>{processingText}</span>
                        </div>
                    </div>
                )}
                <div className="text-lg font-semibold mb-4 text-center" style={{ color: "var(--modal-fg)" }}>
                    {isProcessing ? processingTitle : title}
                </div>
                <div className="flex justify-center gap-4 mt-4">
                    <button
                        className="px-4 py-2 rounded border transition-colors hover:bg-blue-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onCancel}
                        disabled={isProcessing}
                        style={{
                            background: "var(--modal-bg)",
                            borderColor: "var(--modal-border)",
                            color: "var(--modal-muted-fg)",
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        className={`px-4 py-2 rounded ${buttonColorClasses[confirmButtonColor]} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                        onClick={onConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing && <FiLoader size={16} className="animate-spin" />}
                        {isProcessing ? processingText : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
