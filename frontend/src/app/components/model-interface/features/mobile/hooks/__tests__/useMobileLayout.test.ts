import { renderHook } from '@testing-library/react';
import { useMobileLayout } from '../useMobileLayout';

describe('useMobileLayout', () => {
    it('returns desktop styles when isMobile is false', () => {
        const { result } = renderHook(() =>
            useMobileLayout({
                isMobile: false,
                keyboardHeight: 0,
                browserInfo: null,
                visualViewportRect: null,
            })
        );

        expect(result.current.isFullScreenMobile).toBe(false);
        expect(result.current.containerStyle.position).toBe('relative');
        expect(result.current.containerStyle.zIndex).toBe(40);
        expect(result.current.containerStyle.top).toBe('auto');
        expect(result.current.containerStyle.left).toBe('auto');
        expect(result.current.containerStyle.width).toBe('100%');
        expect(result.current.containerStyle.height).toBe('100%');

        expect(result.current.chatAreaStyle.display).toBe('flex');
        expect(result.current.chatAreaStyle.flexDirection).toBe('column');
        expect(result.current.chatAreaStyle.minHeight).toBe(0);
        expect(result.current.chatAreaStyle.paddingLeft).toBeUndefined();
        expect(result.current.chatAreaStyle.paddingRight).toBeUndefined();

        expect(result.current.spacerStyle.height).toBe('12px');
        expect(result.current.inputContainerStyle.flexShrink).toBe(0);
    });

    it('returns mobile styles when isMobile is true and keyboard is closed', () => {
        const { result } = renderHook(() =>
            useMobileLayout({
                isMobile: true,
                keyboardHeight: 0,
                browserInfo: { isIOS: true, isAndroid: false, isSafari: true } as any,
                visualViewportRect: null,
            })
        );

        expect(result.current.isFullScreenMobile).toBe(true);
        expect(result.current.containerStyle.position).toBe('fixed');
        expect(result.current.containerStyle.zIndex).toBe(45);
        expect(result.current.containerStyle.top).toBe(0);
        expect(result.current.containerStyle.left).toBe(0);
        expect(result.current.containerStyle.width).toBe('100vw');
        expect(result.current.containerStyle.height).toBe('100%');

        expect(result.current.chatAreaStyle.paddingLeft).toBe('16px');
        expect(result.current.chatAreaStyle.paddingRight).toBe('16px');
        expect(result.current.spacerStyle.height).toBe('8px');

        // Input container has hardware acceleration on mobile
        expect(result.current.inputContainerStyle.transform).toBe('translate3d(0, 0, 0)');
        expect(result.current.inputContainerStyle.backfaceVisibility).toBe('hidden');
    });

    it('docks properly to visualViewport when keyboard opens on mobile browser', () => {
        const { result } = renderHook(() =>
            useMobileLayout({
                isMobile: true,
                keyboardHeight: 320,
                browserInfo: { isIOS: true, isAndroid: false, isSafari: true } as any,
                visualViewportRect: { top: 0, height: 524 },
            })
        );

        expect(result.current.containerStyle.position).toBe('fixed');
        expect(result.current.containerStyle.top).toBe(0);
        // Container height follows the exact visible viewport without double-shrinking
        expect(result.current.containerStyle.height).toBe('524px');
    });

    it('falls back to keyboardHeight subtraction when visualViewportRect is not available', () => {
        const { result } = renderHook(() =>
            useMobileLayout({
                isMobile: true,
                keyboardHeight: 280,
                browserInfo: { isIOS: false, isAndroid: true } as any,
                visualViewportRect: null,
            })
        );

        expect(result.current.containerStyle.position).toBe('fixed');
        expect(result.current.containerStyle.height).toBe('calc(100% - 280px)');
    });
});
