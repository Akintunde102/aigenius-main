import React from "react";
import { getModelCreditBurnWarning } from "../utils/modelWalletAffordance.utils";

type ModelCreditBurnIndicatorProps = {
  burnPercentage: number;
  className?: string;
  as?: "span" | "p";
};

export function ModelCreditBurnIndicator({
  burnPercentage,
  className = "",
  as: Tag = "span",
}: ModelCreditBurnIndicatorProps) {
  return (
    <Tag
      className={`inline-flex w-fit max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-tight tracking-tight border-amber-500/40 bg-amber-500/15 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300 ${className}`}
      title={`A single message with this model could consume ~${burnPercentage}% of your current credits.`}
    >
      <span aria-hidden>🔥</span>
      <span>{getModelCreditBurnWarning(burnPercentage)}</span>
    </Tag>
  );
}
