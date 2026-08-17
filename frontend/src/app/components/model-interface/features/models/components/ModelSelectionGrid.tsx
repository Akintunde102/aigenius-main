import React, { useCallback, useEffect, useLayoutEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Model } from "@/app/components/model-interface/shared/types";
import { ModelSelectionCard } from "./ModelSelectionCard";

export interface ModelSelectionSection {
  title: string;
  models: Model[];
}

type VirtualRow =
  | { type: "header"; title: string }
  | { type: "model"; model: Model };

const CARD_GAP_PX = 12;
const HEADER_ROW_HEIGHT_PX = 38;

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
  const modelRowEstimate = isMobile ? 100 : 118;

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
    (index: number) => {
      const row = virtualRows[index];
      if (!row) return modelRowEstimate;
      if (row.type === "header") return HEADER_ROW_HEIGHT_PX;
      return modelRowEstimate + CARD_GAP_PX;
    },
    [virtualRows, modelRowEstimate],
  );

  const virtualizer = useVirtualizer({
    count: virtualRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
  });

  // Modal portals often mount before the scroll pane has a stable height (especially in
  // Electron). Without a remeasure, the virtualizer returns zero rows until a tab switch.
  useLayoutEffect(() => {
    virtualizer.measure();
    const frame = requestAnimationFrame(() => {
      virtualizer.measure();
    });
    return () => cancelAnimationFrame(frame);
  }, [listKey, virtualRows.length, virtualizer]);

  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl) return;

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => virtualizer.measure());
    });
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [parentRef, virtualizer, listKey]);

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
                height: HEADER_ROW_HEIGHT_PX,
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
              paddingBottom: CARD_GAP_PX,
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
