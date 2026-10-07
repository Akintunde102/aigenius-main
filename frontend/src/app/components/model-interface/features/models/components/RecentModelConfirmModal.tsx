import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiClock, FiX } from "react-icons/fi";
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
import { MODAL_ELEVATED_Z_INDEX } from "@/lib/utils/modal-z-index";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [isOpen, onClose]);

  if (!isOpen || !model || !mounted) return null;

  const portalTarget =
    typeof document !== "undefined"
      ? document.getElementById("modal-root") ?? document.body
      : null;
  if (!portalTarget) return null;

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

  return createPortal(
    (
      <div
        className="app-modal-overlay backdrop-blur-[2px]"
        style={{ zIndex: MODAL_ELEVATED_Z_INDEX }}
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recent-model-confirm-title"
          className="app-modal-panel mx-4 max-w-md shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="app-modal-panel-header">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="app-surface-card flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ color: "var(--modal-fg)" }}
                  aria-hidden
                >
                  <FiClock size={18} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--modal-muted-fg)" }}
                  >
                    {t("modelPicker.recentlyPicked", "Recently Picked")}
                  </p>
                  <h2
                    id="recent-model-confirm-title"
                    className="truncate text-base font-semibold leading-snug"
                  >
                    {t("modelPicker.useModelPrompt", "Use {name}?", { name: displayName })}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label={t("common.close", "Close")}
                className="shrink-0 rounded-lg p-2 transition-colors hover:[background-color:var(--sidebar-row-hover)] focus:outline-none"
                style={{ color: "var(--modal-muted-fg)" }}
                onClick={onClose}
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="app-modal-panel-body">
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

            <div className="mt-5 flex justify-end gap-2">
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
          </div>
        </div>
      </div>
    ) as any,
    portalTarget,
  );
}
