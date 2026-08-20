import { useCallback, useEffect, useMemo, useState } from "react";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { useWalletSocket } from "@/lib/hooks/useWalletSocket";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";

export function useWorkflowsStudioWallet(hydrated: boolean, authBlocked: boolean) {
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  useWalletTopUpReturn(setShowWalletModal, "sidebar");
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [walletCreditsLoading, setWalletCreditsLoading] = useState(false);

  const creditsHoverTitle = useMemo(() => {
    if (walletCreditsLoading) return "Loading credits…";
    if (walletCredits === null) return "Click to open wallet and add credits";
    const formatted = walletCredits.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Available credits: ${formatted}. Click to add credits.`;
  }, [walletCredits, walletCreditsLoading]);

  const refreshWalletCredits = useCallback(async () => {
    try {
      const userDetails = await getUserDetails(true);
      const w = userDetails?.config?.wallet;
      const n = typeof w === "number" ? w : Number(w);
      setWalletCredits(Number.isFinite(n) ? n : null);
    } catch {
      /* keep existing balance in UI */
    }
  }, []);

  const handleSocketWalletCredits = useCallback((payload: { newBalance: number }) => {
    setWalletCredits(payload.newBalance);
  }, []);

  useWalletSocket({ onWalletUpdated: handleSocketWalletCredits });

  const handleOpenCreditsModal = useCallback(() => {
    setShowWalletModal(true);
    void refreshWalletCredits();
  }, [refreshWalletCredits]);

  useEffect(() => {
    if (!hydrated || authBlocked) {
      setWalletCreditsLoading(false);
      return;
    }
    let cancelled = false;
    setWalletCreditsLoading(true);
    void (async () => {
      try {
        const userDetails = await getUserDetails(false);
        if (cancelled) return;
        const w = userDetails?.config?.wallet;
        const n = typeof w === "number" ? w : Number(w);
        setWalletCredits(Number.isFinite(n) ? n : null);
      } catch {
        if (!cancelled) setWalletCredits(null);
      } finally {
        if (!cancelled) setWalletCreditsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, authBlocked]);

  return {
    showWalletModal,
    setShowWalletModal,
    paymentModalLoading,
    setPaymentModalLoading,
    walletCredits,
    walletCreditsLoading,
    creditsHoverTitle,
    handleOpenCreditsModal,
    refreshWalletCredits,
  };
}
