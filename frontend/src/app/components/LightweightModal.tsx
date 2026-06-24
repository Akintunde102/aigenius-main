import React, { useCallback, useRef, useEffect } from 'react';

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

    // Memoized overlay click handler to prevent unnecessary re-renders
    const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (closeOnOverlayClick && e.target === overlayRef.current) {
            onClose();
        }
    }, [closeOnOverlayClick, onClose]);

    // Optimized escape key handler with passive listener
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Use passive listener for better performance
        document.addEventListener('keydown', handleEscape, { passive: true });

        return () => {
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, closeOnEscape, onClose]);

    // Focus management for accessibility (minimal implementation)
    useEffect(() => {
        if (!isOpen) return;

        const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements && focusableElements.length > 0) {
            (focusableElements[0] as HTMLElement).focus();
        }
    }, [isOpen]);

    // Conditional rendering - no DOM nodes when closed
    if (!isOpen) return null;

    return (
        <div
            ref={overlayRef}
            className={`lwm-overlay ${overlayClassName}`}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                backgroundColor: 'var(--modal-overlay)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                ref={modalRef}
                className={`lwm-content ${className}`}
                style={{
                    backgroundColor: 'var(--modal-bg)',
                    color: 'var(--modal-fg)',
                    border: '1px solid var(--modal-border)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.45)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
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
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '4px',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
};

export default LightweightModal;
