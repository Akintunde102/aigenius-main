import {
  MODEL_CARD_ROW_ESTIMATE_PX,
  MODEL_SECTION_HEADER_ROW_HEIGHT_PX,
  estimateModelSelectionRowSize,
  getModelSelectionRowKey,
} from "../modelSelectionGrid.utils";

const rows = [
  { type: "header" as const, title: "Quick picks" },
  { type: "model" as const, model: { id: "anthropic/claude-sonnet-4.5" } },
  { type: "model" as const, model: { id: "google/gemini-2.5-pro" } },
];

describe("estimateModelSelectionRowSize", () => {
  it("sizes compact cards far below the old 118px featured-card slots", () => {
    expect(estimateModelSelectionRowSize(1, rows, false)).toBe(
      MODEL_CARD_ROW_ESTIMATE_PX.desktop,
    );
    expect(estimateModelSelectionRowSize(1, rows, true)).toBe(
      MODEL_CARD_ROW_ESTIMATE_PX.mobile,
    );
    expect(MODEL_CARD_ROW_ESTIMATE_PX.desktop).toBeLessThan(60);
    expect(MODEL_CARD_ROW_ESTIMATE_PX.mobile).toBeLessThan(60);
  });

  it("uses the section header height for titles and missing rows", () => {
    expect(estimateModelSelectionRowSize(0, rows, false)).toBe(
      MODEL_SECTION_HEADER_ROW_HEIGHT_PX,
    );
    expect(estimateModelSelectionRowSize(99, rows, false)).toBe(
      MODEL_SECTION_HEADER_ROW_HEIGHT_PX,
    );
  });

  it("reserves space under section titles so the next card does not overlap", () => {
    expect(MODEL_SECTION_HEADER_ROW_HEIGHT_PX).toBeGreaterThanOrEqual(44);
  });
});

describe("getModelSelectionRowKey", () => {
  it("keys models by id so tab switches do not reuse the wrong measured height", () => {
    expect(getModelSelectionRowKey(1, rows)).toBe(
      "model:anthropic/claude-sonnet-4.5",
    );
    expect(getModelSelectionRowKey(0, rows)).toBe("header:Quick picks");
  });
});
