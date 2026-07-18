import { useEffect, useMemo } from "react";
import { CHAT_CONFIG } from "../features/chat/hooks";
import { isWalletRelatedChatError } from "../features/chat/hooks/errorHandling.utils";
import { getModelAverageRequestPrice, USD_TO_NGN } from "../shared/utils";
import { isE2eBrowserWalletBypassEnabled } from "@/lib/e2e-wallet-bypass";
import type { Model } from "../shared/types";

type Params = {
  selectedModel: Model | null;
  wallet: number | null;
  error: string;
  setError: (value: string) => void;
};

export function useModelInterfaceWalletGate({
  selectedModel,
  wallet,
  error,
  setError,
}: Params) {
  const requiredWalletBalance = useMemo(() => {
    if (!selectedModel) {
      return CHAT_CONFIG.MIN_WALLET_BALANCE;
    }

    const averageCostUSD = getModelAverageRequestPrice(selectedModel);
    const averageCostCredits = averageCostUSD * USD_TO_NGN;
    const dynamicRequirement =
      averageCostCredits > 0
        ? averageCostCredits * CHAT_CONFIG.MODEL_BALANCE_FACTOR
        : 0;

    return Math.max(CHAT_CONFIG.MIN_WALLET_BALANCE, dynamicRequirement);
  }, [selectedModel]);

  const insufficientFundsMessage = useMemo(() => {
    if (!selectedModel) {
      return undefined;
    }

    const modelLabel = selectedModel.name || selectedModel.id;
    const roundedRequired = Math.ceil(requiredWalletBalance);
    return `You need at least ${roundedRequired} credits to use ${modelLabel}.`;
  }, [selectedModel, requiredWalletBalance]);

  const isInsufficientCredits = useMemo(() => {
    if (isE2eBrowserWalletBypassEnabled()) {
      return false;
    }
    return (
      wallet !== null &&
      Number.isFinite(wallet) &&
      wallet < requiredWalletBalance
    );
  }, [wallet, requiredWalletBalance]);

  useEffect(() => {
    if (
      wallet !== null &&
      Number.isFinite(wallet) &&
      wallet >= requiredWalletBalance &&
      error &&
      isWalletRelatedChatError(error)
    ) {
      setError("");
    }
  }, [wallet, error, requiredWalletBalance, setError]);

  return {
    requiredWalletBalance,
    insufficientFundsMessage,
    isInsufficientCredits,
  };
}
