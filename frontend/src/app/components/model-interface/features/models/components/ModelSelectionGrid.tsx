import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Model } from "@/app/components/model-interface/shared/types";
import { ModelSelectionCard } from "./ModelSelectionCard";
import {
  ModelPickerSectionBlock,
  ModelPickerSectionLabel,
} from "./ModelPickerSectionLabel";
import {
  MODEL_CARD_GAP_PX,
  buildModelSelectionVirtualRows,
  estimateModelSelectionRowSize,
  getModelSelectionRowKey,
  isModelSectionCollapsed,
} from "./modelSelectionGrid.utils";

export interface ModelSelectionSection {
  title: string;
  models: Model[];
}

type VirtualRow =
  | {
      type: "header";
      title: string;
      modelCount: number;
      isCollapsed: boolean;
      isFirstSection: boolean;
      hasLeadingControl: boolean;
    }
  | { type: "model"; model: Model; isLastInSection: boolean };

function ModelSectionHeader({
  title,
  modelCount,
  isCollapsed,
  isFirstSection,
  hasLeadingControl,
  onToggle,
}: {
  title: string;
  modelCount: number;
  isCollapsed: boolean;
  isFirstSection: boolean;
  hasLeadingControl: boolean;
  onToggle: () => void;
}) {
  const countLabel = modelCount === 1 ? "1 model" : `${modelCount} models`;
  const headerTitle = isCollapsed
    ? `${title} — click to expand`
    : `${title} — click to collapse`;

  const blockClassName = [
    isFirstSection && hasLeadingControl ? "pt-0" : "",
    isCollapsed ? "" : "pb-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <ModelPickerSectionBlock
      isFirst={isFirstSection && !hasLeadingControl}
      className={blockClassName || undefined}
    >
      <ModelPickerSectionLabel
        onClick={onToggle}
        title={headerTitle}
        ariaExpanded={!isCollapsed}
      >
        {title}
      </ModelPickerSectionLabel>
      {isCollapsed ? (
        <p
          className="px-1 text-[10px] leading-tight tabular-nums"
          style={{ color: "var(--sidebar-muted-fg)", opacity: 0.65 }}
        >
          {countLabel}
        </p>
      ) : null}
    </ModelPickerSectionBlock>
  );
}

interface ModelSelectionGridProps {
  parentRef: React.RefObject<HTMLDivElement | null>;
  /** Busts virtualizer layout when tab/data shape changes (e.g. favorites → all sections). */
  listKey?: string;
  /** True when an affordability toggle sits directly above the grid. */
  hasLeadingControl?: boolean;
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
  wallet?: number | null;
  onAddCredits?: () => void;
}

export const ModelSelectionGrid = React.memo(({
  parentRef,
  listKey,
  hasLeadingControl = false,
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
  wallet,
  onAddCredits,
}: ModelSelectionGridProps) => {
  const [scrollPaneHeight, setScrollPaneHeight] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedSections({});
  }, [listKey]);

  const toggleSectionCollapsed = useCallback((title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !isModelSectionCollapsed(title, prev),
    }));
  }, []);

  const virtualRows = useMemo((): VirtualRow[] => {
    return buildModelSelectionVirtualRows(
      sections,
      models,
      collapsedSections,
      hasLeadingControl,
    ) as VirtualRow[];
  }, [sections, models, collapsedSections, hasLeadingControl]);

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

  const slotPadding = isMobile ? "px-1" : "px-2";

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
              <ModelSectionHeader
                title={row.title}
                modelCount={row.modelCount}
                isCollapsed={row.isCollapsed}
                isFirstSection={row.isFirstSection}
                hasLeadingControl={row.hasLeadingControl}
                onToggle={() => toggleSectionCollapsed(row.title)}
              />
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
              wallet={wallet}
              selectedModelId={selectedModelId}
              onAddCredits={onAddCredits}
            />
          </div>
        );
      })}
    </div>
  );
});
