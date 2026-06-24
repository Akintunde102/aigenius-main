import React, { useCallback, memo } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import ModelSelectionFeaturedCard from "./ModelSelectionFeaturedCard";

interface ModelSelectionCardProps {
  model: Model;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  onSelect: (model: Model) => void;
  averageCost: number;
  isSelected: boolean;
  onShowDetails: (model: Model) => void;
  isMobile: boolean;
  isSortingByReleaseDate?: boolean;
}

/**
 * Stable wrapper so React.memo on ModelSelectionFeaturedCard actually works.
 * Inline lambdas like `() => handleModelSelect(model)` are new on every render,
 * defeating memo. By owning stable useCallback refs here, we skip re-renders
 * for all cards whose data hasn't changed.
 */
export const ModelSelectionCard = memo(function ModelSelectionCard({
  model,
  isPinned,
  onTogglePin,
  onSelect,
  averageCost,
  isSelected,
  onShowDetails,
  isMobile,
  isSortingByReleaseDate,
}: ModelSelectionCardProps) {
  const handleSelect = useCallback(
    () => onSelect(model),
    [model, onSelect],
  );
  const handlePin = useCallback(
    () => onTogglePin(model.id),
    [model.id, onTogglePin],
  );
  const handleDetails = useCallback(
    () => onShowDetails(model),
    [model, onShowDetails],
  );

  return (
    <ModelSelectionFeaturedCard
      model={model}
      isPinned={isPinned}
      onTogglePin={handlePin}
      onSelect={handleSelect}
      averageCost={averageCost}
      isSelected={isSelected}
      onShowDetails={handleDetails}
      isMobile={isMobile}
      isSortingByReleaseDate={isSortingByReleaseDate}
    />
  );
});
