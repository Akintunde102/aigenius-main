import {
  MODEL_CARD_ROW_ESTIMATE_PX,
  MODEL_PICKER_MODEL_ROW_GAP_PX,
  buildModelSelectionVirtualRows,
  estimateModelPickerSectionHeaderHeight,
  estimateModelSelectionRowSize,
  getModelSelectionRowKey,
} from "../modelSelectionGrid.utils";

const rows = [
  {
    type: "header" as const,
    title: "Quick picks",
    modelCount: 2,
    isCollapsed: false,
    isFirstSection: true,
    hasLeadingControl: false,
  },
  { type: "model" as const, model: { id: "anthropic/claude-sonnet-4.5" }, isLastInSection: false },
  { type: "model" as const, model: { id: "google/gemini-2.5-pro" }, isLastInSection: true },
];

describe("estimateModelSelectionRowSize", () => {
  it("sizes compact cards far below the old 118px featured-card slots", () => {
    expect(estimateModelSelectionRowSize(1, rows, false)).toBe(
      MODEL_CARD_ROW_ESTIMATE_PX.desktop + MODEL_PICKER_MODEL_ROW_GAP_PX,
    );
    expect(estimateModelSelectionRowSize(1, rows, true)).toBe(
      MODEL_CARD_ROW_ESTIMATE_PX.mobile + MODEL_PICKER_MODEL_ROW_GAP_PX,
    );
    expect(MODEL_CARD_ROW_ESTIMATE_PX.desktop).toBeLessThan(60);
    expect(MODEL_CARD_ROW_ESTIMATE_PX.mobile).toBeLessThan(60);
  });

  it("uses the section header height for titles and missing rows", () => {
    expect(estimateModelSelectionRowSize(0, rows, false)).toBe(
      estimateModelPickerSectionHeaderHeight(true, false, false),
    );
    expect(estimateModelSelectionRowSize(99, rows, false)).toBe(
      MODEL_CARD_ROW_ESTIMATE_PX.desktop,
    );
  });

  it("keeps section headers compact and aligned with sidebar rhythm", () => {
    expect(estimateModelPickerSectionHeaderHeight(true, false, false)).toBe(19);
    expect(estimateModelPickerSectionHeaderHeight(false, false, false)).toBe(23);
    expect(estimateModelPickerSectionHeaderHeight(true, false, true)).toBe(15);
    expect(estimateModelPickerSectionHeaderHeight(true, true, false)).toBe(34);
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
