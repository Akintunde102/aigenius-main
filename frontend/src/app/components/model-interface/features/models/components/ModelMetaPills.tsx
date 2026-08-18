import React, { memo, useMemo } from "react";
import { Model } from "@/app/components/model-interface/shared/types";
import { buildModelMetaPills } from "../utils/modelMetaPills.utils";

type ModelMetaPillsProps = {
  model: Model;
  averageCost: number;
  isMobile?: boolean;
  highlightReleaseDate?: boolean;
};

export const ModelMetaPills = memo(function ModelMetaPills({
  model,
  averageCost,
  isMobile = false,
  highlightReleaseDate = false,
}: ModelMetaPillsProps) {
  const pills = useMemo(
    () => buildModelMetaPills(model, averageCost),
    [model, averageCost],
  );

  if (pills.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1 min-w-0 ${isMobile ? "mt-1" : "mt-1.5"}`}
    >
      {pills.map((pill) => {
        const isReleaseHighlight = highlightReleaseDate && pill.key === "release";
        const isCost = pill.tone === "cost";

        return (
          <span
            key={pill.key}
            className={`app-chip max-w-full ${isReleaseHighlight ? "app-chip--active" : ""}`}
            style={
              isCost && averageCost > 0
                ? { color: "var(--credits-fg)" }
                : undefined
            }
          >
            <span
              className={`truncate font-medium leading-tight ${isMobile ? "text-[9px]" : "text-[11px]"}`}
            >
              {pill.label}
            </span>
          </span>
        );
      })}
    </div>
  );
});
