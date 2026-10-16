import React, { useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MODAL_ELEVATED_Z_INDEX } from '@/lib/utils/modal-z-index';
import { useAppModalEscape } from '@/app/components/modals/AppModal';

interface LightweightModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    overlayClassName?: string;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
}

/**
 * Ultra-lightweight modal component optimized for minimal processing power consumption.
 *
 * Performance optimizations:
 * - No CSS animations or transitions
 * - Minimal DOM operations
 * - Passive event listeners where possible
 * - No backdrop-filter or expensive CSS effects
 * - Efficient event delegation
 * - Conditional rendering to avoid unnecessary DOM nodes
 * - Optimized event listener cleanup
 */
export const LightweightModal: React.FC<LightweightModalProps> = ({
    isOpen,
    onClose,
    children,
    className = '',
    overlayClassName = '',
    closeOnOverlayClick = true,
    closeOnEscape = true,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
}) => {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useAppModalEscape(onClose, isOpen && closeOnEscape);

    const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === overlayRef.current) {
            onClose();
        }
    }, [closeOnOverlayClick, onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements && focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
        }
    }, [isOpen]);

    if (!isOpen || !mounted || typeof document === 'undefined') {
        return null;
    }

    const portalTarget = document.getElementById('modal-root') ?? document.body;

    const overlay = (
        <div
            ref={overlayRef}
            className={`app-modal-overlay ${overlayClassName}`.trim()}
            onClick={handleOverlayClick}
            style={{ zIndex: MODAL_ELEVATED_Z_INDEX }}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                className={`app-modal-panel app-modal-panel--shell max-h-[90vh] max-w-[90vw] overflow-auto ${className}`.trim()}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );

    return createPortal(overlay, portalTarget);
};

/**
 * Even more minimal modal for extreme performance requirements.
 * Removes all styling and accessibility features for maximum speed.
 */
export const MinimalModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown, { passive: true });
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="app-modal-overlay"
            style={{
                zIndex: MODAL_ELEVATED_Z_INDEX,
                backgroundColor: 'var(--modal-overlay)',
            }}
            onClick={onClose}
        >
            <div
                className="app-modal-panel app-modal-panel--shell"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export default LightweightModal;
