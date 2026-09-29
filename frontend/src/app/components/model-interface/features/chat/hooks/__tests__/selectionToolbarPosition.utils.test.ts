import {
  computeSelectionToolbarPosition,
  pickHighlightRect,
  SELECTION_TOOLBAR_GAP_PX,
} from "../selectionToolbarPosition.utils";

function rect(partial: {
  left: number;
  top: number;
  width: number;
  height: number;
}) {
  return {
    left: partial.left,
    top: partial.top,
    width: partial.width,
    height: partial.height,
    right: partial.left + partial.width,
    bottom: partial.top + partial.height,
    x: partial.left,
    y: partial.top,
    toJSON: () => ({}),
  } as DOMRect;
}

function fakeRange(rects: ReturnType<typeof rect>[], bounding = rects[0]) {
  return {
    getClientRects: () => rects,
    getBoundingClientRect: () => bounding,
  };
}

function fakeParent(partial: { left: number; top: number; width?: number; height?: number }) {
  const width = partial.width ?? 720;
  const height = partial.height ?? 400;
  return {
    getBoundingClientRect: () =>
      rect({ left: partial.left, top: partial.top, width, height }),
  };
}

describe("pickHighlightRect", () => {
  it("ignores empty rects and falls back to the last visible line", () => {
    const chosen = pickHighlightRect([
      rect({ left: 10, top: 20, width: 0, height: 0 }),
      rect({ left: 40, top: 80, width: 120, height: 18 }),
      rect({ left: 40, top: 200, width: 180, height: 18 }),
    ]);

    expect(chosen?.top).toBe(200);
  });

  it("picks the visible rect nearest the pointer instead of a wrapping box above the highlight", () => {
    const wrappingLink = rect({ left: 40, top: 80, width: 200, height: 18 });
    const highlight = rect({ left: 160, top: 200, width: 180, height: 18 });

    const chosen = pickHighlightRect([wrappingLink, highlight], { x: 200, y: 208 });

    expect(chosen).toEqual(highlight);
  });
});

describe("computeSelectionToolbarPosition", () => {
  const parent = fakeParent({ left: 100, top: 50 });

  it("anchors flush above the highlighted line, not the bounding union of extra rects", () => {
    const wrappingBox = rect({ left: 140, top: 90, width: 240, height: 18 });
    const highlight = rect({ left: 220, top: 220, width: 160, height: 18 });
    const boundingUnion = rect({ left: 140, top: 90, width: 240, height: 148 });

    const placement = computeSelectionToolbarPosition({
      range: fakeRange([wrappingBox, highlight], boundingUnion),
      overlayParent: parent,
      pointer: { x: 280, y: 228 },
    });

    expect(placement).toEqual({
      left: highlight.left + highlight.width / 2 - 100,
      top: highlight.top - 50 - SELECTION_TOOLBAR_GAP_PX,
      isBelow: false,
    });
  });

  it("does not subtract a guessed chip height when placing above the highlight", () => {
    const highlight = rect({ left: 200, top: 180, width: 120, height: 18 });

    const placement = computeSelectionToolbarPosition({
      range: fakeRange([highlight]),
      overlayParent: parent,
    });

    expect(placement?.top).toBe(highlight.top - 50 - SELECTION_TOOLBAR_GAP_PX);
    expect(placement?.top).not.toBe(highlight.top - 50 - 40);
  });

  it("places the chip below the highlight when it would clip the viewport top", () => {
    const highlight = rect({ left: 200, top: 40, width: 120, height: 18 });

    const placement = computeSelectionToolbarPosition({
      range: fakeRange([highlight]),
      overlayParent: parent,
      viewportTopSafe: 56,
    });

    expect(placement).toEqual({
      left: highlight.left + highlight.width / 2 - 100,
      top: highlight.bottom - 50 + SELECTION_TOOLBAR_GAP_PX,
      isBelow: true,
    });
  });

  it("returns null when the range has no visible rects", () => {
    const empty = rect({ left: 0, top: 0, width: 0, height: 0 });

    expect(
      computeSelectionToolbarPosition({
        range: fakeRange([empty], empty),
        overlayParent: parent,
      }),
    ).toBeNull();
  });
});
