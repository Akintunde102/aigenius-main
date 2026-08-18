export const MODEL_CARD_GAP_PX = 8;
export const MODEL_SECTION_HEADER_ROW_HEIGHT_PX = 38;

/**
 * Compact picker rows are title + meta pills only (no description).
 * Keep this close to the painted height. A large overestimate (the old 118px)
 * shows up as empty space under each card whenever measurement is delayed.
 */
export const MODEL_CARD_ROW_ESTIMATE_PX = {
  mobile: 68,
  desktop: 76,
} as const;

export type ModelSelectionVirtualRow =
  | { type: "header"; title: string }
  | { type: "model"; model: { id: string } };

export function estimateModelSelectionRowSize(
  index: number,
  rows: ReadonlyArray<ModelSelectionVirtualRow>,
  isMobile: boolean,
): number {
  const row = rows[index];
  if (!row || row.type === "header") {
    return MODEL_SECTION_HEADER_ROW_HEIGHT_PX;
  }
  return isMobile
    ? MODEL_CARD_ROW_ESTIMATE_PX.mobile
    : MODEL_CARD_ROW_ESTIMATE_PX.desktop;
}

export function getModelSelectionRowKey(
  index: number,
  rows: ReadonlyArray<ModelSelectionVirtualRow>,
): string {
  const row = rows[index];
  if (!row) return String(index);
  if (row.type === "header") return `header:${row.title}`;
  return `model:${row.model.id}`;
}
