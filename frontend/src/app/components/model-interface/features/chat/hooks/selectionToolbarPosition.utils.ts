export type SelectionToolbarPlacement = {
  left: number;
  top: number;
  isBelow: boolean;
};

export const SELECTION_TOOLBAR_GAP_PX = 8;
export const SELECTION_TOOLBAR_VIEWPORT_TOP_SAFE_PX = 56;

type RectLike = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type RangeLike = {
  getClientRects: () => ArrayLike<RectLike>;
  getBoundingClientRect: () => RectLike;
};

function isVisibleRect(rect: RectLike): boolean {
  return rect.width > 0 && rect.height > 0;
}

function distanceToRect(pointer: { x: number; y: number }, rect: RectLike): number {
  const clampedX = Math.min(Math.max(pointer.x, rect.left), rect.right);
  const clampedY = Math.min(Math.max(pointer.y, rect.top), rect.bottom);
  const dx = pointer.x - clampedX;
  const dy = pointer.y - clampedY;
  return dx * dx + dy * dy;
}

export function pickHighlightRect(
  rects: RectLike[],
  pointer?: { x: number; y: number },
): RectLike | null {
  const visible = rects.filter(isVisibleRect);
  if (visible.length === 0) {
    return null;
  }

  if (!pointer) {
    return visible[visible.length - 1] ?? null;
  }

  let best = visible[0];
  let bestDistance = Infinity;
  for (const rect of visible) {
    const distance = distanceToRect(pointer, rect);
    if (distance < bestDistance) {
      best = rect;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Positions the selection chip flush against the highlighted line.
 *
 * Uses the visible text rect nearest the pointer (not Range.getBoundingClientRect,
 * which unions every client rect and can include a wrapping <a>/list-item box
 * that starts many lines above the highlight). `top` is the attachment edge:
 * highlight top minus gap when placing above, highlight bottom plus gap when
 * placing below. The chip should use `-translate-y-full` when `isBelow` is false
 * so its own height is not guessed.
 */
export function computeSelectionToolbarPosition(params: {
  range: RangeLike;
  overlayParent: Pick<HTMLElement, "getBoundingClientRect">;
  pointer?: { x: number; y: number };
  viewportTopSafe?: number;
  gap?: number;
}): SelectionToolbarPlacement | null {
  const clientRects = Array.from(params.range.getClientRects());
  const bounding = params.range.getBoundingClientRect();
  const highlight =
    pickHighlightRect(clientRects, params.pointer) ??
    (isVisibleRect(bounding) ? bounding : null);

  if (!highlight) {
    return null;
  }

  const parentRect = params.overlayParent.getBoundingClientRect();
  const gap = params.gap ?? SELECTION_TOOLBAR_GAP_PX;
  const viewportTopSafe = params.viewportTopSafe ?? SELECTION_TOOLBAR_VIEWPORT_TOP_SAFE_PX;
  const isBelow = highlight.top < viewportTopSafe;

  return {
    left: highlight.left + highlight.width / 2 - parentRect.left,
    top: isBelow
      ? highlight.bottom - parentRect.top + gap
      : highlight.top - parentRect.top - gap,
    isBelow,
  };
}
