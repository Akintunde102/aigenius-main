'use client';

import React from 'react';
import type { ResizeEdge } from './useResizablePanel';

const EDGE_CONFIG: Record<
    ResizeEdge,
    { className: string; cursor: string; title: string }
> = {
    n: { className: 'top-0 left-3 right-3 h-1.5', cursor: 'ns-resize', title: 'Resize height' },
    s: { className: 'bottom-0 left-3 right-3 h-1.5', cursor: 'ns-resize', title: 'Resize height' },
    e: { className: 'top-3 bottom-3 right-0 w-1.5', cursor: 'ew-resize', title: 'Resize width' },
    w: { className: 'top-3 bottom-3 left-0 w-1.5', cursor: 'ew-resize', title: 'Resize width' },
    ne: { className: 'top-0 right-0 h-3 w-3', cursor: 'nesw-resize', title: 'Resize panel' },
    nw: { className: 'top-0 left-0 h-3 w-3', cursor: 'nwse-resize', title: 'Resize panel' },
    se: { className: 'bottom-0 right-0 h-3 w-3', cursor: 'nwse-resize', title: 'Resize panel' },
    sw: { className: 'bottom-0 left-0 h-3 w-3', cursor: 'nesw-resize', title: 'Resize panel' },
};

export function PanelResizeHandles({
    edges,
    onResizeHandlePointerDown,
    isResizing,
}: {
    edges: ResizeEdge[];
    onResizeHandlePointerDown: (edge: ResizeEdge) => (event: React.PointerEvent<HTMLElement>) => void;
    isResizing: boolean;
}) {
    return (
        <>
            {edges.map((edge) => {
                const config = EDGE_CONFIG[edge];
                return (
                    <div
                        key={edge}
                        role="separator"
                        aria-orientation={edge === 'w' || edge === 'e' ? 'vertical' : 'horizontal'}
                        aria-label={config.title}
                        title={config.title}
                        className={`absolute z-20 touch-none ${config.className} ${
                            isResizing ? 'opacity-100' : 'opacity-0 hover:opacity-100'
                        }`}
                        style={{
                            cursor: config.cursor,
                            background:
                                edge === 'w'
                                    ? 'linear-gradient(to right, color-mix(in srgb, var(--chat-accent) 55%, transparent), transparent)'
                                    : undefined,
                        }}
                        onPointerDown={onResizeHandlePointerDown(edge)}
                    />
                );
            })}
        </>
    );
}
