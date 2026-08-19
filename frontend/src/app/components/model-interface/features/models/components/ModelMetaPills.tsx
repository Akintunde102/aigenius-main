import React, { memo } from "react";
import { ModelMetaPill } from "../utils/modelMetaPills.utils";

type ModelMetaPillsProps = {
  items: ModelMetaPill[];
  isMobile?: boolean;
};

export const ModelMetaPills = memo(function ModelMetaPills({
  items,
  isMobile = false,
}: ModelMetaPillsProps) {
  if (items.length === 0) return null;

  return (
    <p
      className={`app-model-card__supporting min-w-0 truncate ${isMobile ? "text-[10px]" : ""}`}
    >
      {items.map((item) => item.label).join(" · ")}
    </p>
  );
});
