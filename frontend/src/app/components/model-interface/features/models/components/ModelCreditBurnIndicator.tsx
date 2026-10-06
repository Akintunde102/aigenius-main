import React from "react";
import { useLanguage } from "@/lib/providers/LanguageProvider";

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
  const { t } = useLanguage();
  return (
    <Tag
      className={`inline-flex w-fit max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-tight tracking-tight border-amber-500/40 bg-amber-500/15 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/15 dark:text-amber-300 ${className}`}
      title={t("modelDetails.burnTitle", "A single message with this model could consume ~{percent}% of your current credits.", {
        percent: burnPercentage,
      })}
    >
      <span aria-hidden>🔥</span>
      <span>{t("modelPicker.burnWarning", "Burns ~{percent}% of credits", { percent: burnPercentage })}</span>
    </Tag>
  );
}
