import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import { RenderErrorBoundary } from "@/app/components/RenderErrorBoundary";
import { ModelSelectionCard } from "./ModelSelectionCard";
import {
  ModelPickerSectionBlock,
  ModelPickerSectionLabel,
} from "./ModelPickerSectionLabel";
import {
  MODEL_CARD_GAP_PX,
  buildModelSelectionVirtualRows,
  isModelSectionCollapsed,
} from "./modelSelectionGrid.utils";
import { useLanguage } from "@/lib/providers/LanguageProvider";

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
  /** When set, renders titled sections in one scrolling list. */
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
  /** ID of the recently-picked model being previewed (shows 'Click to use' CTA). */
  previewedModelId?: string;
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
  previewedModelId,
}: ModelSelectionGridProps) => {
  const { t } = useLanguage();
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

  // Reset scroll when the catalog view changes. The list is in normal flow, so
  // a leftover scroll offset from the previous filter would hide the first rows.
  useLayoutEffect(() => {
    parentRef?.current?.scrollTo?.({ top: 0 });
  }, [parentRef, listKey]);

  const slotPadding = isMobile ? "px-1" : "px-2";

  if (totalModelCount === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (totalModelCount === 0) {
    return (
      <div className="text-sm" style={{ color: "var(--modal-muted-fg)" }}>
        {t("modelPicker.noModelsShort", "No models found")}
      </div>
    );
  }

  return (
    <RenderErrorBoundary
      logLabel="[model-picker]"
      resetKey={listKey}
      message={t("modelPicker.listFailed", "Could not show the model list.")}
    >
      <div className="flex w-full flex-col" style={{ gap: MODEL_CARD_GAP_PX }}>
        {virtualRows.map((row) => {
          if (row.type === "header") {
            return (
              <div key={`header:${row.title}`} className={slotPadding}>
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
            <div key={`model:${row.model.id}`} className={slotPadding}>
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
                isPreviewedRecent={previewedModelId != null && previewedModelId === row.model.id}
              />
            </div>
          );
        })}
      </div>
    </RenderErrorBoundary>
  );
});

ModelSelectionGrid.displayName = 'ModelSelectionGrid';
