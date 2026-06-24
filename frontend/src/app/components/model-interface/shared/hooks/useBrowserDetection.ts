import { useState, useEffect } from 'react';
import { getBrowserInfo, getMobileBreakpoint, BrowserInfo } from '@/lib/utils/browserDetection';

interface UseBrowserDetectionReturn {
    isMobile: boolean;
    browserInfo: BrowserInfo | null;
    mobileBreakpoint: number;
    isLoading: boolean;
}

/**
 * Centralized hook for browser and device detection
 * Eliminates duplicate mobile detection logic across components
 */
export function useBrowserDetection(): UseBrowserDetectionReturn {
    const [isMobile, setIsMobile] = useState(false);
    const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const browser = getBrowserInfo();
        setBrowserInfo(browser);

        const breakpoint = getMobileBreakpoint();

        const checkMobile = () => {
            setIsMobile(window.innerWidth <= breakpoint);
        };

        checkMobile();
        setIsLoading(false);

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return {
        isMobile,
        browserInfo,
        mobileBreakpoint: getMobileBreakpoint(),
        isLoading
    };
}
