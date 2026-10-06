/**
 * Link-style rendering for text anchored to a side thread, via the CSS Custom Highlight API.
 * Styles live in chat-layout.scss (`::highlight(orphan-thread-link)`); an overlay can't recolor text.
 */

export const ORPHAN_LINK_HIGHLIGHT = 'orphan-thread-link';
export const ORPHAN_LINK_HOVER_HIGHLIGHT = 'orphan-thread-link-hover';

type HighlightCtor = new (...ranges: Range[]) => Set<Range>;
type HighlightRegistry = Map<string, Set<Range>>;

function getHighlightApi(): { Highlight: HighlightCtor; registry: HighlightRegistry } | null {
    if (typeof CSS === 'undefined') return null;
    const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
    const Highlight = (globalThis as unknown as { Highlight?: HighlightCtor }).Highlight;
    return registry && Highlight ? { Highlight, registry } : null;
}

export function isOrphanLinkHighlightSupported(): boolean {
    return getHighlightApi() !== null;
}

const rangesByOwner: Record<string, Map<string, Range[]>> = {
    [ORPHAN_LINK_HIGHLIGHT]: new Map(),
    [ORPHAN_LINK_HOVER_HIGHLIGHT]: new Map(),
};

function publish(name: string): void {
    const api = getHighlightApi();
    if (!api) return;

    const all = Array.from(rangesByOwner[name].values()).flat();
    if (all.length === 0) {
        api.registry.delete(name);
        return;
    }
    api.registry.set(name, new api.Highlight(...all));
}

/** Replace the ranges contributed by one message; pass `[]` to clear. */
export function setOrphanLinkRanges(
    name: typeof ORPHAN_LINK_HIGHLIGHT | typeof ORPHAN_LINK_HOVER_HIGHLIGHT,
    ownerKey: string,
    ranges: Range[],
): void {
    if (ranges.length === 0) {
        rangesByOwner[name].delete(ownerKey);
    } else {
        rangesByOwner[name].set(ownerKey, ranges);
    }
    publish(name);
}
