import { CHAT_CONFIG } from "../../chat/hooks/chatOperations.constants";
import {
  getModelAverageRequestPrice,
  USD_TO_NGN,
} from "@/app/components/model-interface/shared/utils";
import type { Model } from "@/app/components/model-interface/shared/types";
import { isE2eBrowserWalletBypassEnabled } from "@/lib/e2e-wallet-bypass";

/** Minimum wallet balance (credits) required to pick/use a model. */
export function computeModelRequiredBalance(
  model: Model | null,
  averageCostUsd?: number,
): number {
  if (!model) {
    return CHAT_CONFIG.MIN_WALLET_BALANCE;
  }

  const averageCostUSD =
    averageCostUsd !== undefined &&
    Number.isFinite(averageCostUsd) &&
    averageCostUsd > 0
      ? averageCostUsd
      : getModelAverageRequestPrice(model);

  const averageCostCredits = averageCostUSD * USD_TO_NGN;

  return Math.max(
    CHAT_CONFIG.MIN_WALLET_BALANCE,
    averageCostCredits > 0
      ? averageCostCredits * CHAT_CONFIG.MODEL_BALANCE_FACTOR
      : 0,
  );
}

export function isModelWalletGatingEnabled(): boolean {
  return !isE2eBrowserWalletBypassEnabled();
}

export type ModelPickLockOptions = {
  modelId?: string;
  /** Already-active model stays selectable even when balance is low. */
  selectedModelId?: string;
};

export function isModelPickLocked(
  wallet: number | null | undefined,
  requiredBalance: number,
  options?: ModelPickLockOptions,
): boolean {
  if (!isModelWalletGatingEnabled()) {
    return false;
  }

  if (wallet === null || wallet === undefined || !Number.isFinite(wallet)) {
    return false;
  }

  if (
    options?.selectedModelId &&
    options.modelId &&
    options.selectedModelId === options.modelId
  ) {
    return false;
  }

  return wallet < requiredBalance;
}

export function computeCreditsShortfall(
  wallet: number | null | undefined,
  requiredBalance: number,
): number {
  const current =
    wallet === null || wallet === undefined || !Number.isFinite(wallet)
      ? 0
      : wallet;
  return Math.max(1, Math.ceil(requiredBalance - current));
}

export function getModelWalletLockShortHint(
  requiredBalance: number,
  wallet?: number | null,
): string {
  const more = computeCreditsShortfall(wallet, requiredBalance);
  return `Load ${more} more credits to use`;
}

export function getModelWalletLockBody(
  requiredBalance: number,
  modelName?: string,
): string {
  const rounded = Math.ceil(requiredBalance);
  const label = modelName?.trim() || "This model";
  return `${label} needs a little more fuel — load up with at least ${rounded} credits to unlock it.`;
}

export function getModelWalletLockCta(): string {
  return "Click to load up credits →";
}

export type ModelWalletAffordabilityPartition = {
  affordable: Model[];
  locked: Model[];
};

export function partitionModelsByWalletAffordance(
  models: Model[],
  wallet: number | null | undefined,
  avgCostById: Map<string, number>,
  selectedModelId?: string,
): ModelWalletAffordabilityPartition {
  const affordable: Model[] = [];
  const locked: Model[] = [];

  for (const model of models) {
    const requiredBalance = computeModelRequiredBalance(
      model,
      avgCostById.get(model.id),
    );
    if (
      isModelPickLocked(wallet, requiredBalance, {
        modelId: model.id,
        selectedModelId,
      })
    ) {
      locked.push(model);
    } else {
      affordable.push(model);
    }
  }

  return { affordable, locked };
}

/** @deprecated Use getModelWalletLockBody + getModelWalletLockCta */
export function getModelWalletLockTooltip(
  requiredBalance: number,
  modelName?: string,
): string {
  return `${getModelWalletLockBody(requiredBalance, modelName)} ${getModelWalletLockCta()}`;
}
