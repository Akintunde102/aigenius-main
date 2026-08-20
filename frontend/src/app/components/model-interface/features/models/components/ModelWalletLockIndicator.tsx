import React from "react";
import { getModelWalletLockShortHint } from "../utils/modelWalletAffordance.utils";

type ModelWalletLockIndicatorProps = {
  requiredBalance: number;
  wallet?: number | null;
  className?: string;
  as?: "span" | "p";
};

export function ModelWalletLockIndicator({
  requiredBalance,
  wallet = null,
  className = "",
  as: Tag = "span",
}: ModelWalletLockIndicatorProps) {
  return (
    <Tag
      className={`inline-flex w-fit max-w-full items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold leading-tight tracking-tight [border-color:color-mix(in_srgb,var(--chat-accent)_40%,transparent)] [background-color:color-mix(in_srgb,var(--chat-accent)_16%,var(--chat-composer-bg))] [color:var(--chat-accent)] ${className}`}
    >
      {getModelWalletLockShortHint(requiredBalance, wallet)}
    </Tag>
  );
}
