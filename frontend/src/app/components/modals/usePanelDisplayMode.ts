'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import type { PanelPosition } from './useDraggablePanel';
import type { PanelSize } from './useResizablePanel';

function readTitlebarOffset(): number {
    if (typeof window === 'undefined') return 0;
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--aigenius-desktop-titlebar-top');
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getFullscreenLayout(variant: 'modal' | 'side') {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const titlebarOffset = readTitlebarOffset();
    const availH = vh - titlebarOffset;

    if (variant === 'side') {
        return {
            size: { width: vw, height: availH },
            position: { x: 0, y: titlebarOffset } satisfies PanelPosition,
        };
    }

    return {
        size: { width: vw, height: availH },
        position: { x: 0, y: titlebarOffset } satisfies PanelPosition,
    };
}

export function usePanelDisplayMode(variant: 'modal' | 'side') {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const savedLayoutRef = useRef<{ size: PanelSize; position: PanelPosition | null } | null>(null);

    const resetDisplayMode = useCallback(() => {
        setIsFullscreen(false);
        savedLayoutRef.current = null;
    }, []);

    const toggleFullscreen = useCallback(
        (
            currentSize: PanelSize,
            currentPosition: PanelPosition | null,
        ): { size: PanelSize; position: PanelPosition | null } | null => {
            if (isFullscreen) {
                const saved = savedLayoutRef.current;
                savedLayoutRef.current = null;
                setIsFullscreen(false);
                if (saved) {
                    return { size: saved.size, position: saved.position };
                }
                return null;
            }

            savedLayoutRef.current = { size: currentSize, position: currentPosition };
            setIsFullscreen(true);
            return getFullscreenLayout(variant);
        },
        [isFullscreen, variant],
    );

    const panelChromeStyle: CSSProperties | undefined = isFullscreen ? { borderRadius: 0 } : undefined;

    return {
        isFullscreen,
        resetDisplayMode,
        toggleFullscreen,
        panelChromeStyle,
    };
}
