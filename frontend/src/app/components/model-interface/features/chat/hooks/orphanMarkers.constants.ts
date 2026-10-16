import type { StickyThreadMarker } from '@/app/components/model-interface/shared/types';

/** Stable empty array — avoid `?? []` / default params that allocate per render and retrigger effects. */
export const EMPTY_ORPHAN_MARKERS: readonly StickyThreadMarker[] = [];

export function orphanMarkersDependencyKey(markers: readonly StickyThreadMarker[]): string {
    if (markers.length === 0) {
        return '';
    }
    return markers.map((marker) => marker.markerId).join('|');
}
