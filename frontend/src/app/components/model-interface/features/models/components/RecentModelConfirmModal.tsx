import React from "react";
import { AppModal, AppModalBody, AppModalHeader } from "@/app/components/modals/AppModal";
import { Model } from "@/app/components/model-interface/shared/types";
import {
  formatNGN,
  getModelAverageRequestCredits,
  getModelDisplayName,
  getProvider,
  getProviderLabel,
} from "@/app/components/model-interface/shared/utils";
import { formatContextLength } from "../utils/modelMetaPills.utils";
import {
  computeModelRequiredBalance,
  getModelCreditBurnPercentage,
  computeCreditsShortfall,
  isModelPickLocked,
} from "../utils/modelWalletAffordance.utils";
import { ModelWalletLockIndicator } from "./ModelWalletLockIndicator";
import { ModelCreditBurnIndicator } from "./ModelCreditBurnIndicator";
import { useLanguage } from "@/lib/providers/LanguageProvider";

type RecentModelConfirmModalProps = {
  isOpen: boolean;
  model: Model | null;
  onClose: () => void;
  onConfirm: (model: Model) => void;
  wallet?: number | null;
  onAddCredits?: () => void;
  selectedModelId?: string;
};

export function RecentModelConfirmModal({
  isOpen,
  model,
  onClose,
  onConfirm,
  wallet = null,
  onAddCredits,
  selectedModelId,
}: RecentModelConfirmModalProps) {
  const { t } = useLanguage();

  if (!isOpen || !model) return null;

  const displayName = getModelDisplayName(model);
  const providerLabel = getProviderLabel(getProvider(model.id));
  const averageCost = getModelAverageRequestCredits(model);
  const costLabel = Number.isFinite(averageCost)
    ? averageCost > 0
      ? `${formatNGN(averageCost, true)} ${t("modelPicker.perMessage", "/ msg")}`
      : t("modelPicker.freeLabel", "Free")
    : null;
  const contextLabel = formatContextLength(model.context_length);
  const requiredBalance = computeModelRequiredBalance(model, averageCost);
  const isWalletLocked = isModelPickLocked(wallet, requiredBalance, {
    modelId: model.id,
    selectedModelId,
  });
  const burnPercentage = getModelCreditBurnPercentage(model, wallet, averageCost);
  const description = model.description?.trim() || model.subtitle?.trim() || "";

  const handleConfirm = () => {
    if (isWalletLocked) {
      onAddCredits?.();
      return;
    }
    onConfirm(model);
  };

  return (
    <AppModal
      open={isOpen}
      onClose={onClose}
      size="sm"
      elevated
      ariaLabelledBy="recent-model-confirm-title"
    >
      <AppModalHeader
        titleId="recent-model-confirm-title"
        title={t("modelPicker.useModelPrompt", "Use {name}?", { name: displayName })}
        subtitle={t("modelPicker.recentlyPicked", "Recently Picked")}
        onClose={onClose}
      />
      <AppModalBody className="!pt-2">
            <p className="text-xs leading-relaxed" style={{ color: "var(--modal-muted-fg)" }}>
              {[providerLabel, costLabel, contextLabel].filter(Boolean).join(" · ")}
            </p>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed line-clamp-4" style={{ color: "var(--modal-fg)", opacity: 0.88 }}>
                {description}
              </p>
            ) : null}
            {isWalletLocked ? (
              <ModelWalletLockIndicator
                requiredBalance={requiredBalance}
                wallet={wallet}
                className="mt-3"
              />
            ) : burnPercentage !== null && burnPercentage >= 60 ? (
              <ModelCreditBurnIndicator
                burnPercentage={burnPercentage}
                className="mt-3"
              />
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={{
                  border: "1px solid var(--modal-border)",
                  color: "var(--modal-muted-fg)",
                }}
                onClick={onClose}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className={`app-modal-btn-primary px-4 py-2 text-sm ${
                  isWalletLocked ? "cursor-not-allowed opacity-50 grayscale" : ""
                }`}
                onClick={handleConfirm}
                autoFocus
                title={
                  isWalletLocked
                    ? t('modelPicker.walletLockShort', 'Load {more} more credits to use', {
                        more: computeCreditsShortfall(wallet, requiredBalance),
                      })
                    : `Use ${displayName}`
                }
              >
                {isWalletLocked
                  ? t("modelPicker.loadCreditsToUse", "Load credits to use")
                  : t("modelPicker.useModel", "Use model")}
              </button>
            </div>
      </AppModalBody>
    </AppModal>
  );
}
