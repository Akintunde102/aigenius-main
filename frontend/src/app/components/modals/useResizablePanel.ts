'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { DraggablePanelVariant, PanelPosition } from './useDraggablePanel';

export type PanelSize = { width: number; height: number };
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function getViewportLimits() {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    return {
        maxWidth: Math.max(320, vw - 24),
        maxHeight: Math.max(240, vh - 24),
    };
}

function getDefaultSize(variant: DraggablePanelVariant): PanelSize {
    const { maxWidth, maxHeight } = getViewportLimits();
    if (variant === 'side') {
        return {
            width: Math.min(maxWidth, Math.max(360, Math.min(vwFallback() * 0.5, 704))),
            height: Math.min(maxHeight, Math.round(vhFallback() * 0.75)),
        };
    }
    return {
        width: Math.min(maxWidth, Math.max(480, Math.min(vwFallback() * 0.9, 1152))),
        height: Math.min(maxHeight, Math.round(vhFallback() * 0.75)),
    };
}

function vwFallback() {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
}

function vhFallback() {
    return typeof window !== 'undefined' ? window.innerHeight : 800;
}

function loadStoredSize(storageKey: string, fallback: PanelSize): PanelSize {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as Partial<PanelSize>;
        if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
            return parsed as PanelSize;
        }
    } catch {
        // ignore invalid persisted size
    }
    return fallback;
}

function edgeIncludes(edge: ResizeEdge, direction: 'n' | 's' | 'e' | 'w') {
    return edge.includes(direction);
}

const MIN_WIDTH = 280;
const MIN_HEIGHT = 240;

export function useResizablePanel(
    enabled: boolean,
    panelRef: RefObject<HTMLElement | null>,
    variant: DraggablePanelVariant,
    position: PanelPosition | null,
    onPositionChange: (next: PanelPosition) => void,
) {
    const storageKey = `aigenius-file-preview-size:${variant}`;
    const [size, setSize] = useState<PanelSize>(() =>
        loadStoredSize(storageKey, getDefaultSize(variant)),
    );
    const [isResizing, setIsResizing] = useState(false);
    const cleanupResizeRef = useRef<(() => void) | null>(null);

    const stopResizing = useCallback(() => {
        cleanupResizeRef.current?.();
        cleanupResizeRef.current = null;
        setIsResizing(false);
    }, []);

    useEffect(() => () => cleanupResizeRef.current?.(), []);

    useEffect(() => {
        if (!enabled) return;
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(size));
        } catch {
            // ignore storage failures
        }
    }, [enabled, size, storageKey]);

    useEffect(() => {
        if (!enabled) return;

        const handleWindowResize = () => {
            const { maxWidth, maxHeight } = getViewportLimits();
            setSize((prev) => ({
                width: clamp(prev.width, MIN_WIDTH, maxWidth),
                height: clamp(prev.height, MIN_HEIGHT, maxHeight),
            }));
        };

        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [enabled]);

    const isDockedSidePanel = variant === 'side' && !position;

    const resizeEdges: ResizeEdge[] = isDockedSidePanel
        ? ['w']
        : ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

    const onResizeHandlePointerDown = useCallback(
        (edge: ResizeEdge) => (event: React.PointerEvent<HTMLElement>) => {
            if (!enabled) return;
            event.preventDefault();
            event.stopPropagation();

            const panel = panelRef.current;
            if (!panel) return;

            const rect = panel.getBoundingClientRect();
            const startPointer = { x: event.clientX, y: event.clientY };
            const startSize = { width: rect.width, height: rect.height };
            const startPosition = position ?? { x: rect.left, y: rect.top };
            const { maxWidth, maxHeight } = getViewportLimits();

            if (!position && !isDockedSidePanel) {
                onPositionChange(startPosition);
            }

            setIsResizing(true);

            const handlePointerMove = (moveEvent: PointerEvent) => {
                const dx = moveEvent.clientX - startPointer.x;
                const dy = moveEvent.clientY - startPointer.y;

                let nextWidth = startSize.width;
                let nextHeight = startSize.height;
                let nextX = startPosition.x;
                let nextY = startPosition.y;

                if (edgeIncludes(edge, 'e')) nextWidth = startSize.width + dx;
                if (edgeIncludes(edge, 'w')) {
                    nextWidth = startSize.width - dx;
                    nextX = startPosition.x + dx;
                }
                if (edgeIncludes(edge, 's')) nextHeight = startSize.height + dy;
                if (edgeIncludes(edge, 'n')) {
                    nextHeight = startSize.height - dy;
                    nextY = startPosition.y + dy;
                }

                const clampedWidth = clamp(nextWidth, MIN_WIDTH, maxWidth);
                const clampedHeight = clamp(nextHeight, MIN_HEIGHT, maxHeight);

                if (edgeIncludes(edge, 'w')) {
                    nextX = startPosition.x + (startSize.width - clampedWidth);
                }
                if (edgeIncludes(edge, 'n')) {
                    nextY = startPosition.y + (startSize.height - clampedHeight);
                }

                if (isDockedSidePanel) {
                    setSize((prev) => ({ ...prev, width: clampedWidth }));
                    return;
                }

                setSize({ width: clampedWidth, height: clampedHeight });

                const maxX = Math.max(0, window.innerWidth - clampedWidth);
                const maxY = Math.max(0, window.innerHeight - clampedHeight);
                onPositionChange({
                    x: clamp(nextX, 0, maxX),
                    y: clamp(nextY, 0, maxY),
                });
            };

            const endResize = () => {
                stopResizing();
                window.dispatchEvent(new Event('resize'));
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', endResize);
            window.addEventListener('pointercancel', endResize);

            cleanupResizeRef.current = () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', endResize);
                window.removeEventListener('pointercancel', endResize);
            };
        },
        [enabled, isDockedSidePanel, onPositionChange, panelRef, position, stopResizing],
    );

    const syncSizeFromElement = useCallback(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const rect = panel.getBoundingClientRect();
        const { maxWidth, maxHeight } = getViewportLimits();
        setSize({
            width: clamp(rect.width, MIN_WIDTH, maxWidth),
            height: clamp(rect.height, MIN_HEIGHT, maxHeight),
        });
    }, [panelRef]);

    const panelSizeStyle: CSSProperties = isDockedSidePanel
        ? { width: size.width }
        : { width: size.width, height: size.height };

    return {
        panelSizeStyle,
        size,
        isResizing,
        resizeEdges,
        onResizeHandlePointerDown,
        syncSizeFromElement,
    };
}
