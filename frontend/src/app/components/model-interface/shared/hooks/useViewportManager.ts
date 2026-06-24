import { useState, useEffect } from 'react';
import { getViewportHeight } from '@/lib/utils/browserDetection';
import { BrowserInfo } from '@/lib/utils/browserDetection';

interface UseViewportManagerProps {
    isMobile: boolean;
    browserInfo: BrowserInfo | null;
}

interface ViewportState {
    viewportHeight: number;
    initialHeight: number;
    heightDifference: number;
}

/**
 * Hook to manage viewport height changes and calculations
 * Useful for detecting keyboard open/close states and layout adjustments
 */
export function useViewportManager({ isMobile, browserInfo }: UseViewportManagerProps): ViewportState {
    const [viewportHeight, setViewportHeight] = useState(0);
    const [initialHeight, setInitialHeight] = useState(0);

    useEffect(() => {
        if (typeof window === 'undefined' || !isMobile || !browserInfo) return;

        const initial = window.innerHeight;
        setInitialHeight(initial);
        setViewportHeight(getViewportHeight());

        let timeoutId: NodeJS.Timeout;

        const handleViewportChange = () => {
            if (timeoutId) clearTimeout(timeoutId);

            // Browser-specific debounce timing
            const debounceTime = browserInfo.isIOS ? 150 : 100;

            timeoutId = setTimeout(() => {
                const currentHeight = getViewportHeight();
                setViewportHeight(currentHeight);
            }, debounceTime);
        };

        // Set up appropriate event listeners based on browser capabilities
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            if (browserInfo.isIOS) {
                window.visualViewport.addEventListener('scroll', handleViewportChange);
            }
        } else {
            window.addEventListener('resize', handleViewportChange);
            if (browserInfo.isIOS) {
                window.addEventListener('orientationchange', handleViewportChange);
            }
        }

        // Additional listeners for Android
        if (browserInfo.isAndroid) {
            document.addEventListener('focusin', handleViewportChange);
            document.addEventListener('focusout', handleViewportChange);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);

            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
                if (browserInfo.isIOS) {
                    window.visualViewport.removeEventListener('scroll', handleViewportChange);
                }
            } else {
                window.removeEventListener('resize', handleViewportChange);
                if (browserInfo.isIOS) {
                    window.removeEventListener('orientationchange', handleViewportChange);
                }
            }

            if (browserInfo.isAndroid) {
                document.removeEventListener('focusin', handleViewportChange);
                document.removeEventListener('focusout', handleViewportChange);
            }
        };
    }, [isMobile, browserInfo]);

    const heightDifference = Math.max(0, initialHeight - viewportHeight);

    return {
        viewportHeight,
        initialHeight,
        heightDifference
    };
}
