import { useState, useEffect, useRef, RefObject } from 'react';
import { getBrowserInfo, getKeyboardDetectionStrategy, getViewportHeight } from '@/lib/utils/browserDetection';

interface UseMobileKeyboardProps {
    isMobile: boolean;
    chatAreaRef: RefObject<HTMLDivElement>;
}

interface MobileKeyboardState {
    keyboardHeight: number;
    isKeyboardOpen: boolean;
    browserInfo: any;
}

export function useMobileKeyboard({ isMobile, chatAreaRef }: UseMobileKeyboardProps): MobileKeyboardState {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [browserInfo, setBrowserInfo] = useState<any>(null);

    // Initialize browser detection
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const browser = getBrowserInfo();
        setBrowserInfo(browser);
    }, []);

    // Handle visual viewport changes for mobile keyboard with cross-browser support
    useEffect(() => {
        if (!isMobile || !browserInfo || typeof window === 'undefined') return;

        let timeoutId: NodeJS.Timeout;
        let chatAreaScrollPosition = 0;
        const initialViewportHeight = window.innerHeight;
        let bodyScrollPosition = 0;

        const strategy = getKeyboardDetectionStrategy();

        const handleKeyboardChange = (isOpen: boolean, height: number) => {
            const chatArea = chatAreaRef.current;

            if (isOpen) {
                // Store scroll positions before keyboard opens
                if (chatArea) {
                    chatAreaScrollPosition = chatArea.scrollTop;
                }
                bodyScrollPosition = window.scrollY;

                // Add browser-specific classes
                document.body.classList.add('keyboard-open');
                if (browserInfo.isIOS) document.body.classList.add('keyboard-open-ios');
                if (browserInfo.isAndroid) document.body.classList.add('keyboard-open-android');

                // Browser-specific body scroll prevention
                if (browserInfo.isIOS) {
                    // iOS Safari specific handling
                    document.body.style.position = 'fixed';
                    document.body.style.top = `-${bodyScrollPosition}px`;
                    document.body.style.width = '100%';
                    document.body.style.overflow = 'hidden';
                } else if (browserInfo.isAndroid) {
                    // Android specific handling - less aggressive
                    document.body.style.overflow = 'hidden';
                }

                // Restore chat scroll position after layout changes
                requestAnimationFrame(() => {
                    if (chatArea && chatAreaScrollPosition >= 0) {
                        chatArea.scrollTop = chatAreaScrollPosition;
                    }
                });
            } else {
                // Store current chat scroll position before closing keyboard
                if (chatArea) {
                    chatAreaScrollPosition = chatArea.scrollTop;
                }

                // Remove keyboard classes
                document.body.classList.remove('keyboard-open', 'keyboard-open-ios', 'keyboard-open-android');

                // Restore body scroll
                if (browserInfo.isIOS) {
                    document.body.style.position = '';
                    document.body.style.top = '';
                    document.body.style.width = '';
                    document.body.style.overflow = '';
                    // Restore scroll position on iOS
                    if (bodyScrollPosition > 0) {
                        window.scrollTo(0, bodyScrollPosition);
                    }
                } else if (browserInfo.isAndroid) {
                    document.body.style.overflow = '';
                }

                // Restore chat area scroll position
                requestAnimationFrame(() => {
                    if (chatArea && chatAreaScrollPosition >= 0) {
                        chatArea.scrollTop = chatAreaScrollPosition;
                    }
                });
            }
        };

        const handleViewportChange = () => {
            if (timeoutId) clearTimeout(timeoutId);

            // Browser-specific debounce timing
            const debounceTime = browserInfo.isIOS ? 150 : 100;

            timeoutId = setTimeout(() => {
                try {
                    let keyboardHeight = 0;
                    let isKeyboardOpen = false;

                    if (strategy === 'visualViewport' && window.visualViewport) {
                        keyboardHeight = Math.max(0, window.innerHeight - window.visualViewport.height);
                        isKeyboardOpen = keyboardHeight > 50; // 50px threshold
                    } else if (strategy === 'hybrid') {
                        // iOS Safari hybrid approach
                        const currentHeight = getViewportHeight();
                        const heightDifference = initialViewportHeight - currentHeight;
                        keyboardHeight = Math.max(0, heightDifference);
                        isKeyboardOpen = keyboardHeight > 150; // Higher threshold for iOS
                    } else {
                        // Fallback resize detection
                        const heightDifference = initialViewportHeight - window.innerHeight;
                        keyboardHeight = Math.max(0, heightDifference);
                        isKeyboardOpen = keyboardHeight > 100;
                    }

                    setKeyboardHeight(keyboardHeight);

                    // Only trigger changes if state actually changed
                    const wasOpen = document.body.classList.contains('keyboard-open');
                    if (isKeyboardOpen !== wasOpen) {
                        handleKeyboardChange(isKeyboardOpen, keyboardHeight);
                    }
                } catch (error) {
                    console.warn('useMobileKeyboard: Error in keyboard detection', error);
                }
            }, debounceTime);
        };

        // Set up event listeners based on browser capabilities
        if (strategy === 'visualViewport' && window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            if (browserInfo.isIOS) {
                window.visualViewport.addEventListener('scroll', handleViewportChange);
            }
        }

        if (strategy === 'hybrid' || strategy === 'resize') {
            window.addEventListener('resize', handleViewportChange);
            if (browserInfo.isIOS) {
                window.addEventListener('orientationchange', handleViewportChange);
            }
        }

        // Additional event listeners for better detection
        if (browserInfo.isAndroid) {
            // Android Chrome specific events
            document.addEventListener('focusin', handleViewportChange);
            document.addEventListener('focusout', handleViewportChange);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);

            // Clean up event listeners based on strategy
            if (strategy === 'visualViewport' && window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
                if (browserInfo.isIOS) {
                    window.visualViewport.removeEventListener('scroll', handleViewportChange);
                }
            }

            if (strategy === 'hybrid' || strategy === 'resize') {
                window.removeEventListener('resize', handleViewportChange);
                if (browserInfo.isIOS) {
                    window.removeEventListener('orientationchange', handleViewportChange);
                }
            }

            if (browserInfo.isAndroid) {
                document.removeEventListener('focusin', handleViewportChange);
                document.removeEventListener('focusout', handleViewportChange);
            }

            // Cleanup body styles and classes on unmount
            document.body.classList.remove('keyboard-open', 'keyboard-open-ios', 'keyboard-open-android');
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isMobile, browserInfo, chatAreaRef]);

    const isKeyboardOpen = document.body.classList.contains('keyboard-open');

    return {
        keyboardHeight,
        isKeyboardOpen,
        browserInfo
    };
}
