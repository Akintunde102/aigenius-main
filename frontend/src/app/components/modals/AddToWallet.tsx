import { InputField } from "@/app/lib/formatic/InputField";
import { addCommas } from "@/app/lib/utils";
import {
  clearUserDetailsCache,
  getUserDetails,
} from "@/lib/calls/get-logged-user-details";
import {
  buildPaymentCallbackUrl,
  appendWalletPaymentReferenceToCallbackUrl,
  clearPendingPaymentStorage,
  consumeWalletTopUpResultState,
  openWalletPaymentCheckout,
  WALLET_PENDING_PAYMENT_KEY,
  WalletPaymentSuccessOptions,
  WalletTopUpReopenTarget,
} from "@/lib/wallet-payment-return";
import {
  readPendingPaymentFromStorage,
  resumePendingWalletPaymentPoll,
  startPendingWalletPaymentPoll,
  subscribePendingWalletPaymentPoll,
} from "@/lib/wallet-pending-payment-poll";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import { openPayazaHostedWalletCheckout, type PayazaCheckoutConfig } from "@/lib/payaza-checkout";
import { isPayazaWalletProvider } from "@/lib/wallet-payment-provider";
import {
  creditsToUsd,
  formatUsdAmount,
  getCreditEquivalenceLabel,
  MIN_TOP_UP_CREDITS,
  WALLET_PAYMENT_CURRENCY,
} from "@/lib/credits";
import { notifyWalletCreditsUpdated } from "@/lib/wallet-credits-migration";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import toast from "react-hot-toast";

interface AddToWalletProps {
  paymentModalLoading: boolean;
  reopenTarget?: WalletTopUpReopenTarget;
  closeModal: () => void;
  onSuccessfulPayment: (
    amountInNaira: string,
    newWalletBalance?: number | null,
    options?: WalletPaymentSuccessOptions,
  ) => void | Promise<void>;
  onClosingPaymentModal: () => void;
  showInsufficientFundsWarning?: boolean;
  insufficientFundsMessage?: string;
}

const MIN_TOP_UP_CREDITS_FALLBACK = MIN_TOP_UP_CREDITS;

type TransactionStatusResponse = {
  status?: string;
  newWalletBalance?: number | null;
};

function isSuccessfulTransactionStatus(status: string | undefined): boolean {
  return status === "successful"
    || status === "success"
    || status === "already_processed";
}

function parseAmountNaira(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

type WalletInitResponse = {
  success: boolean;
  dataReturned: {
    status?: boolean;
    message?: string;
    provider?: "paystack" | "payaza";
    data?: {
      authorization_url?: string;
      access_code?: string;
      reference?: string;
      provider?: "payaza";
      checkout?: PayazaCheckoutConfig;
    };
    reference: string;
    transaction_id: string;
  };
  onSuccessResponse: null | Record<string, unknown>;
};

const AddToWallet = ({
  closeModal,
  paymentModalLoading,
  onSuccessfulPayment,
  reopenTarget = "sidebar",
  showInsufficientFundsWarning,
  insufficientFundsMessage,
}: AddToWalletProps) => {
  const [amount, setAmount] = useState<string>("10000");
  const [updating, setUpdating] = useState(false);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [wallet, setWallet] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [email, setEmail] = useState<string>("");
  const submitInFlightRef = useRef(false);
  const paymentSettledRef = useRef(false);
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [minTopUpCredits, setMinTopUpCredits] = useState(MIN_TOP_UP_CREDITS_FALLBACK);

  // Fetch wallet on mount and after update
  const fetchWallet = async () => {
    setLoadingCredits(true);
    try {
      const user = await getUserDetails();
      setWallet(user?.config?.wallet ?? null);
      setEmail(user?.email ?? "");
      setFirstName(user?.firstName ?? "");
      setLastName(user?.lastName ?? "");
    } catch {
      setWallet(null);
    } finally {
      setLoadingCredits(false);
    }
  };
  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const res = await serverCall({
          serverCallProps: {
            call: serverCalls.getGatewayWalletCreditsConfig,
          },
          authorized: true,
        });
        const config = res?.dataReturned as {
          minTopUpCredits?: number;
        } | undefined;
        if (typeof config?.minTopUpCredits === "number" && config.minTopUpCredits > 0) {
          setMinTopUpCredits(config.minTopUpCredits);
        }
      } catch {
        // Keep env fallback when config cannot be loaded.
      }
    })();
  }, []);

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    paymentSettledRef.current = true;
    submitInFlightRef.current = false;
    setUpdating(false);
    setConfirmingPayment(false);
  }, [showSuccess]);

  const parsedAmount = parseAmountNaira(amount);
  const canSubmitAmount = parsedAmount >= minTopUpCredits;
  const paymentUsd = creditsToUsd(parsedAmount);

  const applySuccessfulTopUp = React.useCallback(async (
    amountInNaira: string,
    newWalletBalance?: number | null,
  ) => {
    clearUserDetailsCache();
    clearPendingPaymentStorage();
    paymentSettledRef.current = true;
    submitInFlightRef.current = false;
    setConfirmingPayment(false);
    setUpdating(false);
    setAmount(amountInNaira);
    if (typeof newWalletBalance === "number") {
      setWallet(newWalletBalance);
    } else {
      await fetchWallet();
    }
    setShowSuccess(true);
    toast.success("Payment verified. Your wallet has been updated.");
    notifyWalletCreditsUpdated(newWalletBalance ?? null);
    void onSuccessfulPayment(amountInNaira, newWalletBalance ?? null, {
      keepModalOpen: true,
    });
  }, [onSuccessfulPayment]);

  const pendingPaymentCallbacks = React.useMemo(() => ({
    onSuccess: async (amountInNaira: string, newWalletBalance: number | null) => {
      await applySuccessfulTopUp(amountInNaira, newWalletBalance);
    },
    onFailed: () => {
      submitInFlightRef.current = false;
      setConfirmingPayment(false);
      setUpdating(false);
      toast.error("Payment failed. Please try again.");
    },
    onTimedOut: () => {
      submitInFlightRef.current = false;
      setConfirmingPayment(false);
      setUpdating(false);
    },
  }), [applySuccessfulTopUp]);

  useEffect(() => {
    return subscribePendingWalletPaymentPoll(pendingPaymentCallbacks);
  }, [pendingPaymentCallbacks]);

  const fetchTransactionStatus = React.useCallback(async (
    reference: string,
  ): Promise<TransactionStatusResponse | null> => {
    try {
      const response = (await serverCall({
        serverCallProps: {
          call: serverCalls.getGatewayWalletTransactionStatus,
        },
        pathArgs: { reference },
        authorized: true,
      })) as { dataReturned?: TransactionStatusResponse };

      return response?.dataReturned ?? null;
    } catch (statusError) {
      console.warn("AddToWallet: transaction status lookup failed:", statusError);
      return null;
    }
  }, []);

  const resolvePendingPayment = React.useCallback(async (
    reference: string,
    amountInNaira: string,
    options: { backgroundOnly?: boolean } = {},
  ) => {
    const verification = await fetchTransactionStatus(reference);
    if (!verification?.status) {
      if (!options.backgroundOnly) {
        setUpdating(false);
      }
      return verification?.status ?? null;
    }

    if (isSuccessfulTransactionStatus(verification.status)) {
      await applySuccessfulTopUp(amountInNaira, verification.newWalletBalance ?? null);
      return verification.status;
    }

    if (verification.status === "failed") {
      clearPendingPaymentStorage();
      setUpdating(false);
      toast.error("Payment failed. Please try again.");
      return verification.status;
    }

    if (!options.backgroundOnly) {
      setUpdating(false);
    }
    return verification.status;
  }, [applySuccessfulTopUp, fetchTransactionStatus]);

  const pollPendingPaymentInBackground = React.useCallback(async (
    reference: string,
    amountInNaira: string,
  ) => {
    void amountInNaira;
    startPendingWalletPaymentPoll(reference, amountInNaira);
  }, []);

  const startPolling = React.useCallback(async (reference: string, amountInNaira: string) => {
    startPendingWalletPaymentPoll(reference, amountInNaira);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const handlePaymentReturn = async () => {
      const paymentResult = consumeWalletTopUpResultState();
      if (paymentResult) {
        setUpdating(false);
        clearUserDetailsCache();

        if (paymentResult.status === "success") {
          const amountInNaira = paymentResult.amountInNaira || amount;
          clearPendingPaymentStorage();
          if (paymentResult.amountInNaira) {
            setAmount(paymentResult.amountInNaira);
          }
          if (typeof paymentResult.newWalletBalance === "number") {
            setWallet(paymentResult.newWalletBalance);
          } else {
            await fetchWallet();
          }
          setShowSuccess(true);
          toast.success(
            paymentResult.message ||
              "Payment verified. Your wallet has been updated.",
          );
          void onSuccessfulPayment(
            amountInNaira,
            paymentResult.newWalletBalance ?? null,
            { keepModalOpen: true },
          );
          return;
        }

        if (
          (paymentResult.status === "pending" || paymentResult.status === "failed")
          && paymentResult.reference
        ) {
          const amountInNaira = paymentResult.amountInNaira || amount;
          const resolvedStatus = await resolvePendingPayment(
            paymentResult.reference,
            amountInNaira,
          );
          if (cancelled) return;

          if (isSuccessfulTransactionStatus(resolvedStatus ?? undefined)) {
            return;
          }

          if (paymentResult.status === "pending") {
            toast(
              paymentResult.message ||
                "We are still confirming your payment.",
              { icon: "⏳" },
            );
            void pollPendingPaymentInBackground(paymentResult.reference, amountInNaira);
            return;
          }

          if (paymentResult.status === "failed") {
            toast.error(
              paymentResult.message || "Payment verification failed. Please try again.",
            );
          }
          return;
        }

        if (paymentResult.status === "failed") {
          const pending = readPendingPaymentFromStorage();
          if (pending?.reference) {
            resumePendingWalletPaymentPoll();
            return;
          }
          toast.error(
            paymentResult.message || "Payment verification failed. Please try again.",
          );
        }
      }

      if (typeof window === "undefined") return;
      const pending = readPendingPaymentFromStorage();
      if (!pending) return;

      try {
        const { reference, amountInNaira } = pending;
        const resolvedStatus = await resolvePendingPayment(reference, amountInNaira);
        if (cancelled) return;

        if (!isSuccessfulTransactionStatus(resolvedStatus ?? undefined) && resolvedStatus !== "failed") {
          resumePendingWalletPaymentPoll();
        }
      } catch (error) {
        console.error("Failed to parse stored pending payment:", error);
        clearPendingPaymentStorage();
        setUpdating(false);
      }
    };

    void handlePaymentReturn();

    return () => {
      cancelled = true;
    };
  }, [amount, onSuccessfulPayment, pollPendingPaymentInBackground, resolvePendingPayment]);

  // Submit logic
  function submit(credits: number) {
    if (
      !credits ||
      Number.isNaN(credits) ||
      credits < minTopUpCredits
    ) {
      toast.error(`Enter a valid amount (minimum ${minTopUpCredits.toLocaleString()} credits)`);
      return;
    }
    if (!email) {
      toast.error("Could not determine user email. Please try again.");
      return;
    }
    handleSubmit(credits.toString(), email);
  }

  async function handleSubmit(credits: string, email: string) {
    if (submitInFlightRef.current || updating || confirmingPayment) {
      return;
    }

    submitInFlightRef.current = true;
    paymentSettledRef.current = false;
    setUpdating(true);
    setConfirmingPayment(false);
    const paymentCallbackUrl = buildPaymentCallbackUrl(credits, reopenTarget);
    try {
      const response = (await serverCall({
        serverCallProps: {
          call: serverCalls.postGatewayWalletTransactionInitiate,
          data: {
            credits,
            paymentCurrency: WALLET_PAYMENT_CURRENCY,
            email,
            firstName,
            lastName,
            callbackUrl: paymentCallbackUrl,
          },
        },
        authorized: true,
      })) as WalletInitResponse;

      const payload = response.dataReturned;
      const provider = payload.provider
        ?? payload.data?.provider
        ?? (isPayazaWalletProvider() ? "payaza" : "paystack");
      const reference = payload.reference || payload.data?.reference;

      if (provider === "payaza") {
        const checkout = payload.data?.checkout
          ?? (payload as { checkout?: PayazaCheckoutConfig }).checkout;
        const publicKey = process.env.NEXT_PUBLIC_PAYAZA_PUBLIC_KEY?.trim();

        if (!checkout || !publicKey) {
          throw new Error("Payaza checkout configuration is incomplete");
        }

        if (reference) {
          const isDesktop = isAigeniusDesktopRuntime();
          localStorage.setItem(
            WALLET_PENDING_PAYMENT_KEY,
            JSON.stringify({
              reference,
              amountInNaira: credits,
              createdAt: Date.now(),
              provider: "payaza",
              // Web: defer verify until Payaza redirects back. Desktop: checkout runs in
              // the system browser, so the app must poll with checkout considered started.
              checkoutStarted: isDesktop,
            }),
          );
          if (isDesktop) {
            void startPolling(reference, credits);
          }
        }

        setUpdating(false);
        const redirectUrl = reference
          ? appendWalletPaymentReferenceToCallbackUrl(paymentCallbackUrl, reference)
          : paymentCallbackUrl;
        openPayazaHostedWalletCheckout({
          publicKey,
          checkout,
          redirectUrl,
        });
        if (isAigeniusDesktopRuntime()) {
          toast(
            "Complete payment in your browser. Your wallet will update automatically in the app.",
            { icon: "🌐", duration: 6000 },
          );
        }
        return;
      }

      if (!payload.data?.authorization_url) {
        throw new Error("Failed to initialize transaction");
      }

      const { data } = payload;

      if (data.authorization_url) {
        if (reference) {
          console.log(
            `AddToWallet: Storing pending payment reference ${reference} and starting polling loop.`,
          );
          localStorage.setItem(
            WALLET_PENDING_PAYMENT_KEY,
            JSON.stringify({
              reference,
              amountInNaira: credits,
              createdAt: Date.now(),
              provider: "paystack",
            }),
          );
          void startPolling(reference, credits);
        }
        setUpdating(false);
        openWalletPaymentCheckout(data.authorization_url);
        if (isAigeniusDesktopRuntime()) {
          toast(
            "Complete payment in your browser. Your wallet will update automatically in the app.",
            { icon: "🌐", duration: 6000 },
          );
        }
        return;
      }

      setUpdating(false);
      toast.error("Payment provider did not return a checkout URL. Please try again.");
    } catch (error) {
      submitInFlightRef.current = false;
      setConfirmingPayment(false);
      setUpdating(false);
      const message = error instanceof Error && error.message
        ? error.message
        : "Failed to initialize payment. Please try again.";
      toast.error(message);
      console.error("Payment initialization error:", error);
    }
  }

  // Escape key closes modal
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeModal]);

  // Modal content
  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all duration-300 ease-out animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div
        className="rounded-xl shadow-2xl w-full max-w-[367px] max-[800px]:max-w-[320px] max-[800px]:mx-4 overflow-hidden flex flex-col border relative animate-slideUp backdrop-blur-xl"
        style={{
          background: "var(--modal-bg)",
          borderColor: "var(--modal-border)",
          color: "var(--modal-fg)",
        }}
      >
        <button
          className="absolute top-1 right-1 text-gray-400 hover:text-red-500 transition-colors duration-200 p-0.5 z-10 rounded-full focus:outline-none"
          onClick={closeModal}
          aria-label="Close modal"
          tabIndex={0}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {/* Insufficient funds warning */}
        {showInsufficientFundsWarning && (
          <div className="bg-red-500 text-white text-xs px-2 py-2 rounded shadow mb-3 mx-auto mt-4 max-w-xs text-center z-50">
            {insufficientFundsMessage ||
              "You need more credits to use this model."}
          </div>
        )}
        <div className="flex flex-col items-center justify-center w-full min-h-[210px] p-10 max-[800px]:p-6 max-[800px]:min-h-[180px]">
          {/* Balance Section */}
          <div
            className="w-full flex flex-col items-center mb-3 border rounded-lg py-3 max-[800px]:py-2 shadow-sm"
            style={{
              background: "var(--modal-bg-muted)",
              borderColor: "var(--modal-border)",
            }}
          >
            <span
              className="text-[11px] mb-0.5 flex items-center gap-1"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block text-blue-400 mr-1"
                viewBox="0 0 24 24"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 3v4" />
                <path d="M8 3v4" />
              </svg>
              Current balance
            </span>
            <div className="w-full flex items-center justify-center mb-1">
              {loadingCredits ? (
                <span className="text-blue-400 text-2xl font-bold animate-pulse">
                  Loading...
                </span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400 text-3xl max-[800px]:text-2xl font-extrabold tracking-tight">
                  {addCommas(wallet ?? 0)} credits
                </span>
              )}
            </div>
            {/* Credit / USD equivalence */}
            <span
              className="text-[12px] font-medium rounded px-2 py-1 mt-2 mb-1 border shadow-sm flex items-center gap-1"
              tabIndex={0}
              aria-label="Credit to USD equivalence"
              style={{
                background: "var(--modal-bg)",
                borderColor: "var(--modal-border)",
                color: "var(--modal-fg)",
              }}
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="inline-block text-blue-400 mr-1"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="8" />
              </svg>
              {getCreditEquivalenceLabel()}
            </span>
          </div>
          {parsedAmount >= minTopUpCredits && (
            <p
              className="text-[12px] text-center mb-2 w-full"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              Pay {formatUsdAmount(paymentUsd)} for {addCommas(parsedAmount)} credits
            </p>
          )}
          {/* Success message if top-up was successful */}
          {showSuccess && (
            <div className="w-full flex flex-col items-center mb-2 animate-fadeIn">
              <span className="text-green-600 font-semibold text-base mb-1 flex items-center gap-1">
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="inline-block text-green-500"
                  viewBox="0 0 24 24"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Top-up Successful!
              </span>
            </div>
          )}
          {/* Credits input and checkout CTA */}
          <form
            className="w-full flex flex-row items-center mb-2 mt-1"
            onSubmit={(e) => {
              e.preventDefault();
              submit(parsedAmount);
            }}
          >
            <div
              style={{ flex: 1 }}
              className="max-[800px]:[&_input]:!h-[40px] max-[800px]:[&_input]:!text-sm [&_input]:!bg-[var(--modal-bg)] [&_input]:!text-[var(--modal-fg)] [&_input]:!border-[var(--modal-border)]"
            >
              <InputField
                label=""
                name="amount"
                type="text"
                placeholder="Credits to add"
                value={amount ? addCommas(Number(amount)) : ""}
                style={{
                  textAlign: "center",
                  height: "44px",
                  fontSize: "16px",
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  borderRight: "none",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
                aria-label="Credits to add"
                onChange={(name: string, value: string) => {
                  const numberValue = value.replace(/[^0-9]/g, "");
                  setAmount(numberValue);
                }}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-semibold h-[44px] max-[800px]:h-[40px] px-5 max-[800px]:px-3 rounded-r-md transition disabled:opacity-60 text-base max-[800px]:text-sm whitespace-nowrap border border-l-0 border-[var(--modal-border)] flex items-center justify-center"
              style={{
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                marginLeft: "-1px",
                minWidth: "110px",
              }}
              disabled={paymentModalLoading || updating || confirmingPayment || !canSubmitAmount}
              aria-label="Add credits"
            >
              {updating || paymentModalLoading ? (
                <svg
                  className="animate-spin mr-2"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.2" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : null}
              Add credits
            </button>
          </form>
          {/* Helper text for min amount */}
          <span
            className="text-[10px] mt-0.5 mb-1"
            style={{ color: "var(--modal-muted-fg)" }}
          >
            Minimum top-up: {minTopUpCredits.toLocaleString()} credits ({formatUsdAmount(creditsToUsd(minTopUpCredits))})
          </span>
          {process.env.NODE_ENV === "development"
            && isPayazaWalletProvider()
            && process.env.NEXT_PUBLIC_PAYAZA_PUBLIC_KEY?.includes("PKTEST") ? (
            <p
              className="text-[10px] mt-1 text-center leading-relaxed"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              Payaza test card: 4508750015741019 · expiry 01/39 · CVV 100
            </p>
          ) : null}
          {(updating || confirmingPayment) && (
            <div
              className="mt-2 text-xs"
              style={{ color: "var(--modal-muted-fg)" }}
            >
              {confirmingPayment
                ? "Confirming your payment with Payaza…"
                : "Please wait, preparing checkout…"}
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.4s;
        }
        .animate-slideUp {
          animation: slideUp 0.4s;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(40px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return (ReactDOM as any).createPortal(modalContent, document.body);
  }
  return null;
};

export default AddToWallet;
