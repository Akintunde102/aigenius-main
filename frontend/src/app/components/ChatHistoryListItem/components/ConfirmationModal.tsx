import React from 'react';
import { FiLoader } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { AppModal, AppModalBody, AppModalHeader } from '@/app/components/modals/AppModal';

interface ConfirmationModalProps {
    isOpen: boolean;
    isProcessing: boolean;
    title: string;
    processingTitle: string;
    confirmText: string;
    processingText: string;
    cancelText?: string;
    confirmButtonColor: 'red' | 'yellow' | 'gray';
    onConfirm: () => void;
    onCancel: () => void;
}

const buttonColorClasses = {
    red: 'app-modal-btn-danger',
    yellow: 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors',
    gray: 'app-modal-btn-secondary !text-xs !py-1.5',
};

const spinnerColorClasses = {
    red: 'border-red-200 border-t-red-500',
    yellow: 'border-amber-200 border-t-amber-500',
    gray: 'border-zinc-200 border-t-zinc-500',
};

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    isProcessing,
    title,
    processingTitle,
    confirmText,
    processingText,
    cancelText,
    confirmButtonColor,
    onConfirm,
    onCancel
}) => {
    const { t } = useLanguage();

    return (
        <AppModal
            open={isOpen}
            onClose={onCancel}
            size="sm"
            className="z-[110]"
            closeOnOverlayClick={!isProcessing}
            closeOnEscape={!isProcessing}
            panelClassName="relative max-w-sm"
        >
            {isProcessing && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] backdrop-blur-xs"
                    style={{ background: "color-mix(in srgb, var(--modal-bg) 92%, transparent)" }}
                >
                    <div className="flex flex-col items-center gap-2">
                        <div className={`h-6 w-6 animate-spin rounded-full border-2 ${spinnerColorClasses[confirmButtonColor]}`} />
                        <span className="text-xs font-medium" style={{ color: "var(--modal-fg)" }}>{processingText}</span>
                    </div>
                </div>
            )}
            <AppModalHeader
                title={isProcessing ? processingTitle : title}
                onClose={onCancel}
            />
            <AppModalBody className={`text-center !py-4 ${isProcessing ? 'pointer-events-none' : ''}`}>
                <div className="flex justify-center gap-2">
                    <button
                        type="button"
                        className="app-modal-btn-secondary !text-xs !py-1.5"
                        onClick={onCancel}
                        disabled={isProcessing}
                    >
                        {cancelText || t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        type="button"
                        className={`flex items-center gap-1.5 !text-xs !py-1.5 ${buttonColorClasses[confirmButtonColor]} disabled:cursor-not-allowed disabled:opacity-50`}
                        onClick={onConfirm}
                        disabled={isProcessing}
                    >
                        {isProcessing && <FiLoader size={13} className="animate-spin" />}
                        {isProcessing ? processingText : confirmText}
                    </button>
                </div>
            </AppModalBody>
        </AppModal>
    );
};
