import React, { useEffect, useState } from 'react';

const STORAGE_KEY = "aigenius_desktop_sidebar_open";

interface MobileSidebarHandlerProps {
    children: (handlers: {
        mobileSidebarOpen: boolean;
        setMobileSidebarOpen: (open: boolean) => void;
    }) => React.ReactNode;
}

export function MobileSidebarHandler({ children }: MobileSidebarHandlerProps) {
    const [mobileSidebarOpen, setMobileSidebarOpenState] = useState<boolean>(() => {
        if (typeof window === "undefined") return false;
        const isMobile = window.innerWidth <= 768;
        if (isMobile) return false;

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null) {
            return saved === "true";
        }
        return true;
    });

    const setMobileSidebarOpen = (open: boolean) => {
        setMobileSidebarOpenState(open);
        if (typeof window !== "undefined" && window.innerWidth > 768) {
            try {
                localStorage.setItem(STORAGE_KEY, String(open));
            } catch {
                /* ignore private mode storage exceptions */
            }
        }
    };

    // Keyboard shortcut (Cmd+B / Ctrl+B) to toggle sidebar on desktop
    useEffect(() => {
        if (typeof window === "undefined") return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
                const target = e.target as HTMLElement | null;
                if (
                    target &&
                    (target.tagName === "INPUT" ||
                        target.tagName === "TEXTAREA" ||
                        target.isContentEditable)
                ) {
                    return;
                }
                e.preventDefault();
                setMobileSidebarOpenState((current) => {
                    const next = !current;
                    if (window.innerWidth > 768) {
                        try {
                            localStorage.setItem(STORAGE_KEY, String(next));
                        } catch {
                            /* ignore storage error */
                        }
                    }
                    return next;
                });
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

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