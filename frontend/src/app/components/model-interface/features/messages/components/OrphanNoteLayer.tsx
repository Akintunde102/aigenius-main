import React from 'react';
import { FiMessageSquare, FiRepeat } from 'react-icons/fi';
import { StickyThreadMarker } from '@/app/components/model-interface/shared/types';

function markerChipLabel(marker: StickyThreadMarker): string {
    const title = marker.title?.trim();
    if (title && title !== 'Side note') {
        return title;
    }
    return 'Side thread';
}

function markerChipTitle(marker: StickyThreadMarker): string {
    const excerpt = marker.anchor.anchorText?.trim() || marker.anchor.messageExcerpt?.trim();
    if (excerpt) {
        return `Open side thread: “${excerpt.length > 80 ? `${excerpt.slice(0, 77)}…` : excerpt}”`;
    }
    return 'Open side thread';
}

interface OrphanNoteLayerProps {
    resolvedMarkerPositions: any[];
    selectionTrigger: any | null;
    onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
    triggerAnchoredReply: (params?: any) => void;
    isSelectionActive?: boolean;
}

export const OrphanNoteLayer: React.FC<OrphanNoteLayerProps> = ({
    resolvedMarkerPositions,
    selectionTrigger,
    onOpenOrphanMarker,
    triggerAnchoredReply,
    isSelectionActive,
}) => {
    // Fix #2: Hide markers during active text selection
    if (isSelectionActive && selectionTrigger) {
        // We still return the selectionTrigger UI itself
        return (
            <div 
                className="absolute z-[100] -translate-x-1/2 animate-in fade-in zoom-in duration-200"
                style={{ left: selectionTrigger.left, top: selectionTrigger.top }}
            >
                <button
                    type="button"
                    onClick={() => triggerAnchoredReply({ selection: selectionTrigger.selection })}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-slate-800"
                >
                    <FiRepeat className="h-3 w-3" />
                    Reply in side thread
                </button>
                {selectionTrigger.isBelow ? (
                    <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                ) : (
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                )}
            </div>
        );
    }
    return (
        <>
            {resolvedMarkerPositions.map(({ marker, left, top, rects }) => {
                const chipLeft = rects.length > 0 ? rects[0].left : left;
                const chipTop = rects.length > 0 ? rects[0].top : top;

                return (
                <React.Fragment key={marker.markerId}>
                    {/* Background Highlights */}
                    {rects.map((r: any, i: number) => (
                        <div
                            key={`${marker.markerId}-rect-${i}`}
                            data-orphan-highlight-id={marker.markerId}
                            className="absolute cursor-pointer rounded-sm border border-blue-400/25 bg-blue-500/12 ring-1 ring-inset ring-blue-400/20 transition-colors duration-200 hover:bg-blue-500/20 hover:ring-blue-400/35"
                            style={{
                                left: r.left,
                                top: r.top,
                                width: r.width,
                                height: r.height,
                                zIndex: 5,
                            }}
                            onClick={() => onOpenOrphanMarker?.(marker)}
                            title={markerChipTitle(marker)}
                        />
                    ))}

                    <div
                        data-orphan-marker-id={marker.markerId}
                        className="absolute z-30 max-w-[min(100%,11rem)] -translate-y-full"
                        style={{ left: chipLeft, top: Math.max(0, chipTop - 4) }}
                    >
                        <button
                            type="button"
                            onClick={() => onOpenOrphanMarker?.(marker)}
                            className="group/marker flex max-w-full items-center gap-1.5 rounded-full border border-blue-300/70 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-blue-800 shadow-[0_2px_10px_rgba(37,99,235,0.18)] backdrop-blur-sm transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-900 hover:shadow-[0_4px_14px_rgba(37,99,235,0.24)] dark:border-blue-500/45 dark:bg-slate-900/95 dark:text-blue-200 dark:hover:border-blue-400/70 dark:hover:bg-slate-800/95 dark:hover:text-blue-100"
                            title={markerChipTitle(marker)}
                            aria-label={markerChipTitle(marker)}
                        >
                            <FiMessageSquare className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                            <span className="truncate">{markerChipLabel(marker)}</span>
                        </button>
                    </div>
                </React.Fragment>
                );
            })}

            {/* Text Selection Trigger */}
            {selectionTrigger && (
                <div 
                    className="absolute z-[100] -translate-x-1/2 animate-in fade-in zoom-in duration-200"
                    style={{ left: selectionTrigger.left, top: selectionTrigger.top }}
                >
                    <button
                        type="button"
                        onClick={() => triggerAnchoredReply({ selection: selectionTrigger.selection })}
                        className="flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-slate-800"
                    >
                        <FiRepeat className="h-3 w-3" />
                        Reply in side thread
                    </button>
                    {selectionTrigger.isBelow ? (
                        <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                    ) : (
                        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900" />
                    )}
                </div>
            )}
        </>
    );
};
