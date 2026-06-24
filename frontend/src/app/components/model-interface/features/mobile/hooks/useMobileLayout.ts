import { useMemo } from 'react';
import { BrowserInfo } from '@/lib/utils/browserDetection';

interface UseMobileLayoutProps {
    isMobile: boolean;
    keyboardHeight: number;
    browserInfo: BrowserInfo | null;
}

interface MobileLayoutStyles {
    containerStyle: React.CSSProperties;
    chatAreaStyle: React.CSSProperties;
    inputContainerStyle: React.CSSProperties;
    spacerStyle: React.CSSProperties;
    isFullScreenMobile: boolean;
}

/**
 * Hook to manage mobile-specific layout calculations and styles
 * Centralizes all mobile layout logic for better maintainability
 */
export function useMobileLayout({
    isMobile,
    keyboardHeight,
    browserInfo
}: UseMobileLayoutProps): MobileLayoutStyles {
    void browserInfo;
    const isFullScreenMobile = isMobile;

    const containerStyle = useMemo(() => ({
        position: isMobile ? 'fixed' as const : 'relative' as const,
        zIndex: isMobile ? 45 : 40,
        top: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        width: isMobile ? '100vw' : '100%',
        height: isMobile ? (keyboardHeight > 0 ? `calc(100% - ${keyboardHeight}px)` : '100%') : '100%'
    }), [isMobile, keyboardHeight]);

    const chatAreaStyle = useMemo(() => ({
        minHeight: 0,
        overflow: 'hidden' as const,
        paddingLeft: isFullScreenMobile ? '16px' : undefined,
        paddingRight: isFullScreenMobile ? '16px' : undefined,
        display: 'flex',
        flexDirection: 'column' as const
    }), [isFullScreenMobile]);

    const spacerStyle = useMemo(() => ({
        height: isMobile ? '8px' : '12px',
        flexShrink: 0,
        backgroundColor: 'transparent'
    }), [isMobile]);

    const inputContainerStyle = useMemo(() => {
        const baseStyle: React.CSSProperties = {
            flexShrink: 0,
            paddingLeft: '8px',
            paddingRight: '8px',
            backgroundColor: 'transparent',
        };

        // Mobile optimizations for better keyboard handling
        if (isMobile) {
            return {
                ...baseStyle,
                transform: 'translate3d(0, 0, 0)', // Force hardware acceleration
                backfaceVisibility: 'hidden' as const,
                willChange: 'transform',
                transition: 'margin-bottom 0.2s ease-in-out'
            };
        }

        return baseStyle;
    }, [isMobile, keyboardHeight, isFullScreenMobile]);

    return {
        containerStyle,
        chatAreaStyle,
        inputContainerStyle,
        spacerStyle,
        isFullScreenMobile
    };
}
