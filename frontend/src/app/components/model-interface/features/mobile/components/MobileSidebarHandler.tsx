import React, { useEffect } from 'react';

interface MobileSidebarHandlerProps {
    children: (handlers: {
        mobileSidebarOpen: boolean;
        setMobileSidebarOpen: (open: boolean) => void;
    }) => React.ReactNode;
}

export function MobileSidebarHandler({ children }: MobileSidebarHandlerProps) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (mobileSidebarOpen && window.innerWidth <= 768) {
            // document.body.style.overflow = 'hidden';
            // document.body.style.height = '100vh';
        } else {
            // Restore body scroll
            document.body.style.overflow = '';
            document.body.style.height = '';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
        };
    }, [mobileSidebarOpen]);

    // On mobile, close sidebar when tapping outside the drawer.
    // Desktop: no click-outside — the sidebar is a persistent collapsible panel,
    // not an overlay modal.  The close button in the header handles dismissal.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!mobileSidebarOpen || window.innerWidth >= 768) return;

            const sidebar = document.querySelector('[data-mobile-sidebar]');
            const toggleButton = document.querySelector('[data-mobile-toggle]');

            if (
                sidebar && !sidebar.contains(event.target as Node) &&
                !(toggleButton && toggleButton.contains(event.target as Node))
            ) {
                setMobileSidebarOpen(false);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [mobileSidebarOpen]);

    return <>{children({ mobileSidebarOpen, setMobileSidebarOpen })}</>;
} 