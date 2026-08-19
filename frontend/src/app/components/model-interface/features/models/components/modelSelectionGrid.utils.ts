export const MODEL_CARD_GAP_PX = 8;
/** Title plus space under it so the next row does not crowd the heading. */
export const MODEL_SECTION_HEADER_ROW_HEIGHT_PX = 48;

/**
 * Single-line picker rows (title + cost + toggle).
 * Keep this close to the painted height so virtualization does not leave gaps.
 */
export const MODEL_CARD_ROW_ESTIMATE_PX = {
  mobile: 48,
  desktop: 50,
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
