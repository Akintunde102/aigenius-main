import React from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { StickyThreadMarker } from '@/app/components/model-interface/shared/types';
import { isOrphanLinkHighlightSupported } from './orphanLinkHighlight.utils';

function markerChipTitle(marker: StickyThreadMarker): string {
    const excerpt = marker.anchor.anchorText?.trim() || marker.anchor.messageExcerpt?.trim();
    if (excerpt) {
        return `Open side thread: “${excerpt.length > 80 ? `${excerpt.slice(0, 77)}…` : excerpt}”`;
    }
    return 'Open side thread';
}

interface SelectionTriggerPosition {
    left: number;
    top: number;
    isBelow?: boolean;
    selection: Selection;
}

interface OrphanNoteLayerProps {
    resolvedMarkerPositions: any[];
    selectionTrigger: SelectionTriggerPosition | null;
    onOpenOrphanMarker?: (marker: StickyThreadMarker) => void;
    triggerAnchoredReply: (params?: { selection?: Selection | null }) => void;
    isSelectionActive?: boolean;
}

function SelectionTriggerChip({
    left,
    top,
    isBelow,
    onClick,
}: {
    left: number;
    top: number;
    isBelow?: boolean;
    onClick: () => void;
}) {
    return (
        <div
            className={`absolute z-[100] -translate-x-1/2 ${isBelow ? "" : "-translate-y-full"}`}
            style={{ left, top }}
        >
            <div className="relative animate-in fade-in zoom-in duration-200">
                <button
                    type="button"
                    onClick={onClick}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl ring-1 ring-white/10 transition-all hover:bg-slate-800 hover:scale-[1.03] active:scale-95 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                    <MessageSquarePlus className="h-3.5 w-3.5 text-sky-400" />
                    Ask further
                </button>
                {isBelow ? (
                    <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 dark:bg-slate-800 ring-1 ring-white/10" />
                ) : (
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900 dark:bg-slate-800 ring-1 ring-white/10" />
                )}
            </div>
        </div>
    );
}

export const OrphanNoteLayer: React.FC<OrphanNoteLayerProps> = ({
    resolvedMarkerPositions,
    selectionTrigger,
    onOpenOrphanMarker,
    triggerAnchoredReply,
    isSelectionActive,
}) => {
    const supportsCustomHighlight = typeof window !== 'undefined' ? isOrphanLinkHighlightSupported() : true;

    // Hide markers during active text selection
    if (isSelectionActive && selectionTrigger) {
        return (
            <SelectionTriggerChip
                left={selectionTrigger.left}
                top={selectionTrigger.top}
                isBelow={selectionTrigger.isBelow}
                onClick={() => triggerAnchoredReply({ selection: selectionTrigger.selection })}
            />
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
                                className={`group/highlight absolute cursor-pointer rounded-none transition-colors duration-150 ${
                                    supportsCustomHighlight
                                        ? 'bg-transparent'
                                        : 'border-b border-blue-500/70 hover:border-blue-600 bg-transparent'
                                }`}
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
                            />
                        );
                    })}
                </React.Fragment>
            ))}

            {/* Text Selection Trigger */}
            {selectionTrigger && (
                <SelectionTriggerChip
                    left={selectionTrigger.left}
                    top={selectionTrigger.top}
                    isBelow={selectionTrigger.isBelow}
                    onClick={() => triggerAnchoredReply({ selection: selectionTrigger.selection })}
                />
            )}
        </>
    );
};
