import React, { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Model } from "@/app/components/model-interface/shared/types";
import { ModelSelectionCard } from "./ModelSelectionCard";
import {
  MODEL_CARD_GAP_PX,
  MODEL_SECTION_HEADER_ROW_HEIGHT_PX,
  estimateModelSelectionRowSize,
  getModelSelectionRowKey,
} from "./modelSelectionGrid.utils";

export interface ModelSelectionSection {
  title: string;
  models: Model[];
}

type VirtualRow =
  | { type: "header"; title: string }
  | { type: "model"; model: Model };

interface ModelSelectionGridProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Busts virtualizer layout when tab/data shape changes (e.g. favorites → all sections). */
  listKey?: string;
  models?: Model[];
  /** When set, renders titled sections (single virtualized list). */
  sections?: ModelSelectionSection[];
  isMobile: boolean;
  emptyState?: React.ReactNode;
  isModelPinned: (id: string) => boolean;
  togglePinModel: (id: string) => void | Promise<void>;
  onSelect: (model: Model) => void;
  avgCostById: Map<string, number>;
  selectedModelId?: string;
  handleShowModelDetails: (model: Model) => void;
  isSortingByReleaseDate: boolean;
}

export const ModelSelectionGrid = React.memo(({
  parentRef,
  listKey,
  models = [],
  sections,
  isMobile,
  emptyState,
  isModelPinned,
  togglePinModel,
  onSelect,
  avgCostById,
  selectedModelId,
  handleShowModelDetails,
  isSortingByReleaseDate,
}: ModelSelectionGridProps) => {
  const [scrollPaneHeight, setScrollPaneHeight] = useState(0);

  const virtualRows = useMemo((): VirtualRow[] => {
    const appendModels = (rows: VirtualRow[], list: Model[]) => {
      for (const model of list) {
        rows.push({ type: "model", model });
      }
    };

    if (sections?.length) {
      const rows: VirtualRow[] = [];
      for (const section of sections) {
        if (section.models.length === 0) continue;
        if (section.title.trim()) {
          rows.push({ type: "header", title: section.title });
        }
        appendModels(rows, section.models);
      }
      return rows;
    }

    const rows: VirtualRow[] = [];
    appendModels(rows, models);
    return rows;
  }, [sections, models]);

  const totalModelCount = sections?.length
    ? sections.reduce((sum, s) => sum + s.models.length, 0)
    : models.length;

  const estimateSize = useCallback(
    (index: number) => estimateModelSelectionRowSize(index, virtualRows, isMobile),
    [virtualRows, isMobile],
  );

  const getItemKey = useCallback(
    (index: number) => getModelSelectionRowKey(index, virtualRows),
    [virtualRows],
  );

  // Portals (especially Electron) can mount before the flex pane has a real height.
  // Enable virtualization only once the scroll box is measurable so we don't lock in
  // empty ranges. Do not call virtualizer.measure() here — it wipes item sizes back
  // to estimates and recreates the oversized gaps.
  useLayoutEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl) return;

    const syncHeight = () => {
      setScrollPaneHeight(scrollEl.clientHeight);
    };
    syncHeight();
    const frame = requestAnimationFrame(syncHeight);

    const observer = new ResizeObserver(syncHeight);
    observer.observe(scrollEl);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [parentRef, listKey]);

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    getItemKey,
    overscan: 5,
    gap: MODEL_CARD_GAP_PX,
    enabled: scrollPaneHeight > 0,
  });

  const slotPadding = isMobile ? "px-2" : "px-4";

  if (totalModelCount === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (totalModelCount === 0) {
    return <div className="text-gray-400 dark:text-zinc-500 text-sm">No models found.</div>;
  }

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = virtualRows[virtualRow.index];
        if (!row) return null;

        if (row.type === "header") {
          return (
            <div
              key={String(virtualRow.key)}
              data-index={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: MODEL_SECTION_HEADER_ROW_HEIGHT_PX,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={slotPadding}
            >
              <h3
                className={`max-w-xl font-medium uppercase tracking-wider ${isMobile ? "text-[9px] pb-1.5 pt-0.5" : "text-[11px] pb-2 pt-1"}`}
                style={{ color: "var(--modal-muted-fg)", opacity: 0.8 }}
              >
                {row.title}
              </h3>
            </div>
          );
        }

        return (
          <div
            key={String(virtualRow.key)}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className={slotPadding}
          >
            <ModelSelectionCard
              model={row.model}
              isPinned={isModelPinned(row.model.id)}
              onTogglePin={togglePinModel}
              onSelect={onSelect}
              averageCost={avgCostById.get(row.model.id) || 0}
              isSelected={selectedModelId === row.model.id}
              onShowDetails={handleShowModelDetails}
              isMobile={isMobile}
              isSortingByReleaseDate={isSortingByReleaseDate}
            />
          </div>
        );
      })}
    </div>
  );
});
