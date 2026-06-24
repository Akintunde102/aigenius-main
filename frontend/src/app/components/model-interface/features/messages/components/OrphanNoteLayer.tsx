import React from 'react';
import { FiRepeat } from 'react-icons/fi';
import { StickyThreadMarker } from '@/app/components/model-interface/shared/types';

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
            {resolvedMarkerPositions.map(({ marker, left, top, rects }) => (
                <React.Fragment key={marker.markerId}>
                    {/* Background Highlights */}
                    {rects.map((r: any, i: number) => (
                        <div
                            key={`${marker.markerId}-rect-${i}`}
                            data-orphan-highlight-id={marker.markerId}
                            className="absolute cursor-pointer rounded-sm bg-blue-500/10 transition-colors duration-200 hover:bg-yellow-400/40"
                            style={{
                                left: r.left,
                                top: r.top,
                                width: r.width,
                                height: r.height,
                                zIndex: 5,
                            }}
                            onClick={() => onOpenOrphanMarker?.(marker)}
                            title={marker.title || 'Open side thread'}
                        />
                    ))}

                    {!rects || rects.length === 0 ? (
                        <div
                            data-orphan-marker-id={marker.markerId}
                            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 group/marker opacity-60 transition-opacity duration-300 hover:opacity-100"
                            style={{ left, top }}
                        >
                            {/* The "Beeping" Pulse Effect */}
                            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-20 group-hover/marker:bg-blue-500 group-hover/marker:opacity-40" />
                            <div className="absolute inset-[-4px] animate-pulse rounded-full bg-blue-400/10 group-hover/marker:bg-blue-500/20" />
                            
                            <button
                                type="button"
                                onClick={() => onOpenOrphanMarker?.(marker)}
                                className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full border border-blue-500/50 bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)] transition-all duration-300 group-hover/marker:scale-125 group-hover/marker:border-blue-400 group-hover/marker:bg-blue-500 group-hover/marker:shadow-[0_0_15px_rgba(37,99,235,0.6)]"
                                title={marker.title || 'Open anchored side note'}
                                aria-label={marker.title || 'Open anchored side note'}
                            >
                                <div className="h-1 w-1 rounded-full bg-white opacity-80" />
                            </button>
                            
                            {/* Tooltip removed as per user request for less obstruction */}
                        </div>
                    ) : null}
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
