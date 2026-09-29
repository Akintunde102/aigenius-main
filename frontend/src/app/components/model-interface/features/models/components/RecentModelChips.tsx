import React from "react";
import { FiClock } from "react-icons/fi";
import { Model } from "@/app/components/model-interface/shared/types";
import { getModelDisplayName } from "@/app/components/model-interface/shared/utils";

interface RecentModelChipsProps {
  recentModels: Model[];
  highlightedModelId?: string;
  onPick: (model: Model) => void;
  isMobile: boolean;
}

export function RecentModelChips({
  recentModels,
  highlightedModelId,
  onPick,
  isMobile,
}: RecentModelChipsProps) {
  if (recentModels.length === 0) return null;

  return (
    <section aria-label="Recently Picked" className="min-w-0">
      <div
        className={`font-semibold uppercase tracking-wider mb-1 ${isMobile ? "text-[9.5px]" : "text-[10px]"}`}
        style={{ color: "var(--modal-muted-fg)" }}
      >
        Recently Picked
      </div>
      <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto min-w-0 pb-0.5">
        {recentModels.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onPick(model)}
            className={`app-chip flex-shrink-0 !py-0.5 !px-2 transition-all ${highlightedModelId === model.id ? "app-chip--active" : ""}`}
          >
            <FiClock size={isMobile ? 10 : 11} className="flex-shrink-0" style={{ color: "var(--modal-muted-fg)" }} />
            <span
              className={`truncate font-medium leading-tight ${isMobile ? "text-[10.5px]" : "text-[11.5px]"}`}
              style={{ color: "var(--sidebar-fg)" }}
            >
              {getModelDisplayName(model)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
