import React from "react";
import { FiClock } from "react-icons/fi";
import { Model } from "@/app/components/model-interface/shared/types";
import { getModelDisplayName } from "@/app/components/model-interface/shared/utils";

interface RecentModelChipsProps {
  recentModels: Model[];
  highlightedModelId?: string;
  onPreview: (model: Model) => void;
  isMobile: boolean;
}

export function RecentModelChips({
  recentModels,
  highlightedModelId,
  onPreview,
  isMobile,
}: RecentModelChipsProps) {
  if (recentModels.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pb-2 min-w-0 ${isMobile ? "px-2" : "px-4"}`}>
      {recentModels.map((model) => (
        <button
          key={model.id}
          type="button"
          onClick={() => onPreview(model)}
          className={`app-chip flex-shrink-0 ${highlightedModelId === model.id ? "app-chip--active" : ""}`}
        >
          <FiClock size={isMobile ? 9 : 13} className="flex-shrink-0" style={{ color: "var(--modal-muted-fg)" }} />
          <span className={`truncate font-medium leading-tight ${isMobile ? "text-[9px]" : "text-[13px]"}`}>
            {getModelDisplayName(model)}
          </span>
        </button>
      ))}
    </div>
  );
}
