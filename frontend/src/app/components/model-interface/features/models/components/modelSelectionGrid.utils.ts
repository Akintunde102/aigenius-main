export const MODEL_CARD_GAP_PX = 0;

/** 11px label × 1.3 line-height */
export const MODEL_PICKER_LABEL_LINE_PX = 15;
export const MODEL_PICKER_SECTION_FIRST_TOP_PX = 4;
export const MODEL_PICKER_SECTION_TOP_PX = 8;
export const MODEL_PICKER_SECTION_BOTTOM_PX = 2;
export const MODEL_PICKER_COLLAPSED_COUNT_PX = 13;
export const MODEL_PICKER_MODEL_ROW_GAP_PX = 2;

/** Sections that start collapsed in the model picker (matches sidebar project sections). */
export const DEFAULT_COLLAPSED_MODEL_SECTION_TITLES = new Set([
  "Need more credits",
]);

/**
 * Single-line picker rows (title + cost + toggle).
 * Keep this close to the painted height so virtualization does not leave gaps.
 */
export const MODEL_CARD_ROW_ESTIMATE_PX = {
  mobile: 46,
  desktop: 48,
} as const;

export type ModelSelectionVirtualRow =
  | {
      type: "header";
      title: string;
      modelCount: number;
      isCollapsed: boolean;
      isFirstSection: boolean;
      hasLeadingControl: boolean;
    }
  | { type: "model"; model: { id: string }; isLastInSection: boolean };

export interface ModelSelectionSectionInput {
  title: string;
  models: ReadonlyArray<{ id: string }>;
}

export function estimateModelPickerSectionHeaderHeight(
  isFirstSection: boolean,
  isCollapsed: boolean,
  hasLeadingControl: boolean,
): number {
  const topPad = isFirstSection
    ? hasLeadingControl
      ? 0
      : MODEL_PICKER_SECTION_FIRST_TOP_PX
    : MODEL_PICKER_SECTION_TOP_PX;
  const label = MODEL_PICKER_LABEL_LINE_PX;
  const count = isCollapsed ? MODEL_PICKER_COLLAPSED_COUNT_PX : 0;
  const bottomPad = isCollapsed ? MODEL_PICKER_SECTION_BOTTOM_PX : 0;
  return topPad + label + count + bottomPad;
}

export function isModelSectionCollapsed(
  title: string,
  collapsedSections: Readonly<Record<string, boolean>>,
): boolean {
  if (title in collapsedSections) {
    return collapsedSections[title] ?? false;
  }
  return DEFAULT_COLLAPSED_MODEL_SECTION_TITLES.has(title);
}

export function buildModelSelectionVirtualRows(
  sections: ReadonlyArray<ModelSelectionSectionInput> | undefined,
  models: ReadonlyArray<{ id: string }>,
  collapsedSections: Readonly<Record<string, boolean>>,
  hasLeadingControl = false,
): ModelSelectionVirtualRow[] {
  const appendModels = (
    rows: ModelSelectionVirtualRow[],
    list: ReadonlyArray<{ id: string }>,
  ) => {
    list.forEach((model, index) => {
      rows.push({
        type: "model",
        model,
        isLastInSection: index === list.length - 1,
      });
    });
  };

  if (sections?.length) {
    const rows: ModelSelectionVirtualRow[] = [];
    let sectionIndex = 0;

    for (const section of sections) {
      if (section.models.length === 0) continue;
      const title = section.title.trim();
      const isCollapsed = title ? isModelSectionCollapsed(title, collapsedSections) : false;
      const isFirstSection = sectionIndex === 0;
      if (title) {
        rows.push({
          type: "header",
          title,
          modelCount: section.models.length,
          isCollapsed,
          isFirstSection,
          hasLeadingControl,
        });
      }
      if (!isCollapsed) {
        appendModels(rows, section.models);
      }
      sectionIndex += 1;
    }
    return rows;
  }

  const rows: ModelSelectionVirtualRow[] = [];
  models.forEach((model, index) => {
    rows.push({
      type: "model",
      model,
      isLastInSection: index === models.length - 1,
    });
  });
  return rows;
}

export function estimateModelSelectionRowSize(
  index: number,
  rows: ReadonlyArray<ModelSelectionVirtualRow>,
  isMobile: boolean,
): number {
  const row = rows[index];
  if (!row) {
    return MODEL_CARD_ROW_ESTIMATE_PX.desktop;
  }

  if (row.type === "header") {
    return estimateModelPickerSectionHeaderHeight(
      row.isFirstSection,
      row.isCollapsed,
      row.hasLeadingControl,
    );
  }

  const cardHeight = isMobile
    ? MODEL_CARD_ROW_ESTIMATE_PX.mobile
    : MODEL_CARD_ROW_ESTIMATE_PX.desktop;

  return row.isLastInSection
    ? cardHeight
    : cardHeight + MODEL_PICKER_MODEL_ROW_GAP_PX;
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
