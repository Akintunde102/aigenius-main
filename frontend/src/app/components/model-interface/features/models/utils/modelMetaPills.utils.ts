import { Model } from "@/app/components/model-interface/shared/types";
import {
  formatNGN,
  getModalityDisplay,
  getProvider,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";

import {
  getModelCreditBurnPercentage,
  getModelCreditBurnWarning,
  HIGH_CREDIT_BURN_THRESHOLD_PERCENT,
} from "./modelWalletAffordance.utils";

export type ModelMetaPill = {
  key: string;
  label: string;
  tone?: "default" | "cost" | "release";
};

export type ModelCardCostSlot = {
  label: string;
  isPaid: boolean;
  burnPercentage?: number | null;
  burnWarning?: string | null;
};

/** Layout slots for the picker card: identity left, tools center, price/actions right. */
export type ModelCardSlots = {
  provider?: string;
  cost?: ModelCardCostSlot;
  release?: string;
  supporting: ModelMetaPill[];
};

export type ModelCardSlotLabels = {
  perMessage: string;
  free: string;
  burnWarning: (percent: number) => string;
};

export function formatContextLength(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M ctx`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ctx`;
  return `${n} ctx`;
}

function formatReleaseDate(created?: number): string {
  if (!created) return "";
  return new Date(created * 1000).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function collectNonTextModalities(model: Model): string[] {
  const seen = new Set<string>();
  const labels: string[] = [];

  const add = (mod: string) => {
    const normalized = (mod || "").trim().toLowerCase();
    if (!normalized || normalized === "text" || seen.has(normalized)) return;
    seen.add(normalized);
    labels.push(getModalityDisplay(mod).label);
  };

  (model.architecture?.input_modalities ?? []).forEach(add);
  (model.architecture?.output_modalities ?? []).forEach(add);

  return labels.slice(0, 3);
}

export function buildModelCardSlots(
  model: Model,
  averageCost: number,
  wallet?: number | null,
  labels?: ModelCardSlotLabels,
): ModelCardSlots {
  const perMessage = labels?.perMessage ?? " / msg";
  const freeLabel = labels?.free ?? "Free";
  const burnWarningFor =
    labels?.burnWarning ??
    ((percent: number) => getModelCreditBurnWarning(percent));
  const provider = getProvider(model.id);
  const providerLabel = getProviderLabel(provider);

  const supporting: ModelMetaPill[] = [];
  collectNonTextModalities(model).forEach((label, index) => {
    supporting.push({ key: `modality-${index}-${label}`, label });
  });

  let cost: ModelCardCostSlot | undefined;
  if (Number.isFinite(averageCost)) {
    const burnPercentage = getModelCreditBurnPercentage(
      model,
      wallet,
      averageCost,
    );
    const isHighBurn =
      burnPercentage !== null &&
      burnPercentage >= HIGH_CREDIT_BURN_THRESHOLD_PERCENT;

    cost =
      averageCost > 0
        ? {
            label: `${formatNGN(averageCost, true)}${perMessage}`,
            isPaid: true,
            burnPercentage,
            burnWarning: isHighBurn
              ? burnWarningFor(burnPercentage)
              : null,
          }
        : { label: freeLabel, isPaid: false };
  }

  return {
    provider:
      providerLabel && provider !== "openrouter" ? providerLabel : undefined,
    cost,
    release: formatReleaseDate(model.created) || undefined,
    supporting,
  };
}

export function buildModelMetaPills(
  model: Model,
  averageCost: number,
): ModelMetaPill[] {
  const slots = buildModelCardSlots(model, averageCost);
  const pills: ModelMetaPill[] = [];

  if (slots.release) {
    pills.push({ key: "release", label: slots.release, tone: "release" });
  }
  pills.push(...slots.supporting);
  if (slots.cost) {
    pills.push({
      key: "cost",
      label: slots.cost.isPaid
        ? `~${formatNGN(averageCost, true)} credits/msg`
        : slots.cost.label,
      tone: "cost",
    });
  }

  return pills;
}
