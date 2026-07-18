'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export type PanelPosition = { x: number; y: number };

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

function getCenteredPosition(panel: HTMLElement): PanelPosition {
    const { width, height } = getPanelSize(panel);
    return {
        x: Math.max(0, (window.innerWidth - width) / 2),
        y: Math.max(0, (window.innerHeight - height) / 2),
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

export function useDraggablePanel(
    enabled: boolean,
    panelRef: RefObject<HTMLElement | null>,
    resetKey: string | null,
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

    const onDragHandlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (!enabled) return;
            if ((event.target as HTMLElement).closest('button')) return;

            const panel = panelRef.current;
            if (!panel) return;

            event.preventDefault();
            event.stopPropagation();

            const current = position ?? getCenteredPosition(panel);
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

    const panelStyle: React.CSSProperties | undefined = enabled
        ? position
            ? { position: 'absolute', left: position.x, top: position.y }
            : {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
              }
        : undefined;

    return {
        panelStyle,
        isDragging,
        onDragHandlePointerDown,
    };
}
