'use client';

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

export type PanelPosition = { x: number; y: number };

export type DraggablePanelVariant = 'modal' | 'side';

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function getPanelSize(panel: HTMLElement) {
    const rect = panel.getBoundingClientRect();
    return {
        width: rect.width || panel.offsetWidth,
        height: rect.height || panel.offsetHeight,
    };
}

function getClampedPosition(panel: HTMLElement, x: number, y: number): PanelPosition {
    const { width, height } = getPanelSize(panel);
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
        x: clamp(x, 0, maxX),
        y: clamp(y, 0, maxY),
    };
}

function getPanelViewportPosition(panel: HTMLElement): PanelPosition {
    const rect = panel.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
}

export function useDraggablePanel(
    enabled: boolean,
    panelRef: RefObject<HTMLElement | null>,
    resetKey: string | null,
    variant: DraggablePanelVariant = 'modal',
) {
    const [position, setPosition] = useState<PanelPosition | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    } | null>(null);
    const cleanupDragRef = useRef<(() => void) | null>(null);

    const stopDragging = useCallback(() => {
        cleanupDragRef.current?.();
        cleanupDragRef.current = null;
        dragRef.current = null;
        setIsDragging(false);
    }, []);

    useEffect(() => {
        if (!enabled) return;
        setPosition(null);
        stopDragging();
    }, [enabled, resetKey, stopDragging]);

    useEffect(() => () => cleanupDragRef.current?.(), []);

    useEffect(() => {
        if (!enabled || !position) return;

        const handleResize = () => {
            const panel = panelRef.current;
            if (!panel) return;
            setPosition((prev) => {
                if (!prev) return prev;
                return getClampedPosition(panel, prev.x, prev.y);
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [enabled, panelRef, position]);

    const onDragHandlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (!enabled) return;
            if ((event.target as HTMLElement).closest('button')) return;

            const panel = panelRef.current;
            if (!panel) return;

            event.preventDefault();
            event.stopPropagation();

            const current = position ?? getPanelViewportPosition(panel);
            setPosition(current);

            dragRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                originX: current.x,
                originY: current.y,
            };
            setIsDragging(true);

            const handlePointerMove = (moveEvent: PointerEvent) => {
                const drag = dragRef.current;
                const activePanel = panelRef.current;
                if (!drag || !activePanel) return;

                const dx = moveEvent.clientX - drag.startX;
                const dy = moveEvent.clientY - drag.startY;
                setPosition(getClampedPosition(activePanel, drag.originX + dx, drag.originY + dy));
            };

            const endDrag = () => stopDragging();

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', endDrag);
            window.addEventListener('pointercancel', endDrag);

            cleanupDragRef.current = () => {
                window.removeEventListener('pointermove', handlePointerMove);
                window.removeEventListener('pointerup', endDrag);
                window.removeEventListener('pointercancel', endDrag);
            };
        },
        [enabled, panelRef, position, stopDragging],
    );

    const panelStyle: CSSProperties | undefined = (() => {
        if (!enabled) return undefined;

        if (position) {
            return {
                position: 'fixed',
                left: position.x,
                top: position.y,
                right: 'auto',
                bottom: 'auto',
                transform: 'none',
                margin: 0,
            };
        }

        if (variant === 'modal') {
            return {
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }

        return undefined;
    })();

    return {
        panelStyle,
        position,
        setPosition,
        isDragging,
        onDragHandlePointerDown,
    };
}
