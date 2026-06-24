'use client';
import { useEffect } from 'react';
import { getBrowserInfo, getViewportHeight, hasReliableVisualViewport } from '@/lib/utils/browserDetection';

export default function ViewportHeightSetter() {
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let lastHeight = 0;
        const browser = getBrowserInfo();

        function setVh() {
            if (typeof window !== 'undefined') {
                // Clear any existing timeout to debounce rapid calls
                if (timeoutId) clearTimeout(timeoutId);

                // Use different debounce timing based on browser
                const debounceTime = browser.isIOS ? 100 : 50;

                timeoutId = setTimeout(() => {
                    try {
                        // Get viewport height using browser-specific method
                        const currentHeight = getViewportHeight();

                        // Prevent unnecessary updates for small changes (< 10px)
                        if (Math.abs(currentHeight - lastHeight) < 10 && lastHeight > 0) {
                            return;
                        }

                        lastHeight = currentHeight;
                        const vh = currentHeight * 0.01;

                        // Set the custom property
                        document.documentElement.style.setProperty('--vh', `${vh}px`);

                        // Also set a fallback for older browsers
                        document.documentElement.style.setProperty('--viewport-height', `${currentHeight}px`);

                        // Set additional properties for different scenarios
                        document.documentElement.style.setProperty('--window-height', `${window.innerHeight}px`);

                        // iOS Safari specific handling
                        if (browser.isIOS && browser.isSafari) {
                            const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0');
                            const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0');
                            document.documentElement.style.setProperty('--safe-area-top', `${safeAreaTop}px`);
                            document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaBottom}px`);
                        }

                    } catch (error) {
                        console.warn('ViewportHeightSetter: Error updating viewport height', error);
                        // Fallback to basic window.innerHeight
                        const fallbackVh = window.innerHeight * 0.01;
                        document.documentElement.style.setProperty('--vh', `${fallbackVh}px`);
                        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
                    }
                }, debounceTime);
            }
        }

        // Initial set
        setVh();

        // Standard event listeners
        window.addEventListener('resize', setVh);
        window.addEventListener('orientationchange', setVh);

        // Visual viewport API listeners (only for browsers with reliable support)
        if (hasReliableVisualViewport() && window.visualViewport) {
            window.visualViewport.addEventListener('resize', setVh);
            // Only listen to scroll on iOS as it can cause issues on Android
            if (browser.isIOS) {
                window.visualViewport.addEventListener('scroll', setVh);
            }
        }

        // Additional mobile-specific listeners
        if (browser.isMobile) {
            // iOS specific events
            if (browser.isIOS) {
                window.addEventListener('scroll', setVh, { passive: true });
                // Handle iOS Safari bounce
                document.addEventListener('touchstart', setVh, { passive: true });
            }

            // Android specific events
            if (browser.isAndroid) {
                // Android Chrome keyboard detection
                window.addEventListener('scroll', setVh, { passive: true });
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);

            window.removeEventListener('resize', setVh);
            window.removeEventListener('orientationchange', setVh);

            if (hasReliableVisualViewport() && window.visualViewport) {
                window.visualViewport.removeEventListener('resize', setVh);
                if (browser.isIOS) {
                    window.visualViewport.removeEventListener('scroll', setVh);
                }
            }

            if (browser.isMobile) {
                window.removeEventListener('scroll', setVh);
                if (browser.isIOS) {
                    document.removeEventListener('touchstart', setVh);
                }
            }
        };
    }, []);

    return null;
} 