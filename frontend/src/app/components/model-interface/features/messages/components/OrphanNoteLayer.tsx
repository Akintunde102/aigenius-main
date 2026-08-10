import React from 'react';
import { FiMessageSquare, FiRepeat } from 'react-icons/fi';
import { StickyThreadMarker } from '@/app/components/model-interface/shared/types';

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
            {resolvedMarkerPositions.map(({ marker, rects }) => (
                <React.Fragment key={marker.markerId}>
                    {rects.map((r: { left: number; top: number; width: number; height: number }, i: number) => {
                        const isLastRect = i === rects.length - 1;
                        const openMarker = () => onOpenOrphanMarker?.(marker);
                        const chipTitle = markerChipTitle(marker);

                        return (
                            <div
                                key={`${marker.markerId}-rect-${i}`}
                                data-orphan-highlight-id={marker.markerId}
                                data-orphan-marker-id={isLastRect ? marker.markerId : undefined}
                                className="group/highlight absolute cursor-pointer rounded-sm border border-blue-400/20 bg-blue-500/10 ring-1 ring-inset ring-blue-400/15 transition-colors duration-200 hover:border-blue-400/35 hover:bg-blue-500/16 hover:ring-blue-400/30"
                                style={{
                                    left: r.left,
                                    top: r.top,
                                    width: r.width,
                                    height: r.height,
                                    zIndex: 5,
                                }}
                                onClick={openMarker}
                                title={chipTitle}
                                role="button"
                                tabIndex={0}
                                aria-label={chipTitle}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openMarker();
                                    }
                                }}
                            >
                                {isLastRect ? (
                                    <span
                                        className="absolute -right-0.5 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-[0_1px_4px_rgba(37,99,235,0.2)] ring-1 ring-blue-300/50 transition group-hover/highlight:text-blue-700 dark:bg-slate-900/95 dark:text-blue-300 dark:ring-blue-500/40"
                                        aria-hidden
                                    >
                                        <FiMessageSquare className="h-2.5 w-2.5" />
                                    </span>
                                ) : null}
                            </div>
                        );
                    })}
                </React.Fragment>
            ))}

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
