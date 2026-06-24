import React from 'react';
import styles from '@/app/components/model-interface/ModelInterface.module.scss';

interface MobileToggleButtonProps {
    isOpen: boolean;
    onToggle: () => void;
    hide?: boolean;
}

export function MobileToggleButton({ isOpen, onToggle, hide = false }: MobileToggleButtonProps) {
    if (hide) return null;

    return (
        <button
            className={`${styles.mobileToggle} ${isOpen ? styles.open : ''}`}
            onPointerDown={(event) => {
                event.preventDefault();
                onToggle();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onToggle();
                }
            }}
            data-mobile-toggle
            aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        >
            <div className={styles.hamburger}>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </button>
    );
}
