import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { addCommas } from "@/app/lib/utils";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import toast from "react-hot-toast";
import { clearUserDetailsCache, getUserDetails } from "@/lib/calls/get-logged-user-details";
import { isAigeniusDesktopRuntime } from "@/lib/utils/desktop-runtime";
import {
    buildPaymentCallbackUrl,
    clearWalletTopUpPendingState,
    clearWalletTopUpReturnState,
    consumeWalletTopUpResultState,
    readWalletTopUpPendingState,
    saveWalletTopUpPendingState,
    WalletPaymentSuccessOptions,
    WalletTopUpReopenTarget,
} from "@/lib/wallet-payment-return";

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

const MIN_TOP_UP_NAIRA = 200;
const PENDING_PAYMENT_POLL_MS = 1500;
const TOP_UP_SUCCESS_TOAST_MS = 5500;

function showTopUpSuccessToast(wasBlocked: boolean, fallbackMessage?: string): void {
    if (wasBlocked) {
        toast.success(
            "You're all set! Credits added — continue your conversation.",
            { duration: TOP_UP_SUCCESS_TOAST_MS, icon: "🎉" },
        );
        return;
    }

    toast.success(
        fallbackMessage || "Top-up successful! Your wallet has been updated.",
        { duration: TOP_UP_SUCCESS_TOAST_MS },
    );
}

function parseAmountNaira(raw: string): number {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return 0;
    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 0;
}

type VerifyPaymentResponse = {
    status: 'success' | 'already_processed' | 'failed' | string;
    message?: string;
    amount?: number;
    newWalletBalance?: number | null;
};

function openPaystackAuthorizationUrl(url: string): 'navigated' | 'external' {
    if (isAigeniusDesktopRuntime() && typeof window.aigeniusDesktop?.openExternal === 'function') {
        window.aigeniusDesktop.openExternal(url);
        return 'external';
    }
    window.location.assign(url);
    return 'navigated';
}

type PaystackInitResponse = {
    success: boolean;
    dataReturned: {
        status: boolean;
        message: string;
        data: {
            authorization_url: string;
            access_code: string;
            reference: string;
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
    reopenTarget = 'sidebar',
    showInsufficientFundsWarning,
    insufficientFundsMessage
}: AddToWalletProps) => {
    const [amount, setAmount] = useState<string>("1000");
    const [updating, setUpdating] = useState(false);
    const [awaitingBrowserPayment, setAwaitingBrowserPayment] = useState(false);
    const [verifyingPayment, setVerifyingPayment] = useState(false);
    const [loadingCredits, setLoadingCredits] = useState(true);
    const [wallet, setWallet] = useState<number | null>(null);
    const [email, setEmail] = useState<string>("");
    const verifyInFlightRef = useRef(false);
    const walletBeforeTopUpRef = useRef<number | null>(null);

    const fetchWallet = useCallback(async (forceRefresh = false) => {
        setLoadingCredits(true);
        try {
            const user = await getUserDetails(forceRefresh);
            setWallet(user?.config?.wallet ?? null);
            setEmail(user?.email ?? "");
            return user?.config?.wallet ?? null;
        } catch {
            setWallet(null);
            return null;
        } finally {
            setLoadingCredits(false);
        }
    }, []);

    useEffect(() => { void fetchWallet(); }, [fetchWallet]);

    const parsedAmount = parseAmountNaira(amount);
    const canSubmitAmount = parsedAmount >= MIN_TOP_UP_NAIRA;

    const applyPaymentSuccess = useCallback(async (
        amountInNaira: string,
        newWalletBalance: number | null | undefined,
        message?: string,
    ) => {
        setUpdating(false);
        setAwaitingBrowserPayment(false);
        clearWalletTopUpPendingState();
        clearWalletTopUpReturnState();
        clearUserDetailsCache();
        setAmount(amountInNaira);
        if (typeof newWalletBalance === 'number') {
            setWallet(newWalletBalance);
        } else {
            await fetchWallet(true);
        }
        showTopUpSuccessToast(Boolean(showInsufficientFundsWarning), message);
        await onSuccessfulPayment(amountInNaira, newWalletBalance ?? null);
        closeModal();
    }, [
        closeModal,
        fetchWallet,
        onSuccessfulPayment,
        showInsufficientFundsWarning,
    ]);

    const verifyPendingPayment = useCallback(async (): Promise<boolean> => {
        const pending = readWalletTopUpPendingState();
        if (!pending || verifyInFlightRef.current) {
            return false;
        }

        verifyInFlightRef.current = true;
        setVerifyingPayment(true);
        try {
            try {
                const response = await serverCall({
                    serverCallProps: {
                        call: serverCalls.postGatewayPaystackTransactionVerify,
                        data: { reference: pending.reference },
                    },
                    authorized: true,
                }) as { dataReturned: VerifyPaymentResponse };

                const verification = response.dataReturned;
                const isVerified = verification.status === 'success'
                    || verification.status === 'already_processed';

                if (isVerified) {
                    await applyPaymentSuccess(
                        pending.amountInNaira,
                        verification.newWalletBalance ?? null,
                        verification.message,
                    );
                    return true;
                }
            } catch {
                /* Payment may still be processing in Paystack */
            }

            const currentWallet = await getUserDetails(true);
            const balance = currentWallet?.config?.wallet ?? null;
            const baseline = walletBeforeTopUpRef.current;
            const expectedIncrease = parseAmountNaira(pending.amountInNaira);

            if (typeof balance === 'number') {
                setWallet(balance);
            }

            if (
                typeof balance === 'number'
                && typeof baseline === 'number'
                && expectedIncrease > 0
                && balance >= baseline + expectedIncrease
            ) {
                await applyPaymentSuccess(
                    pending.amountInNaira,
                    balance,
                    'Payment detected. Your wallet has been updated.',
                );
                return true;
            }

            return false;
        } catch {
            return false;
        } finally {
            verifyInFlightRef.current = false;
            setVerifyingPayment(false);
        }
    }, [applyPaymentSuccess]);

    useEffect(() => {
        const paymentResult = consumeWalletTopUpResultState();
        if (paymentResult) {
            setUpdating(false);
            setAwaitingBrowserPayment(false);
            clearUserDetailsCache();

            if (paymentResult.status === 'success') {
                void applyPaymentSuccess(
                    paymentResult.amountInNaira || '1000',
                    paymentResult.newWalletBalance ?? null,
                    paymentResult.message,
                );
                return;
            }

            toast.error(paymentResult.message || 'Payment verification failed. Please try again.');
            return;
        }

        if (readWalletTopUpPendingState()) {
            setUpdating(false);
            setAwaitingBrowserPayment(true);
        }
    }, [applyPaymentSuccess]);

    useEffect(() => {
        if (awaitingBrowserPayment && typeof wallet === 'number') {
            walletBeforeTopUpRef.current = wallet;
        }
    }, [awaitingBrowserPayment, wallet]);

    useEffect(() => {
        if (!awaitingBrowserPayment) {
            return;
        }

        const checkPendingPayment = () => {
            void verifyPendingPayment();
        };

        checkPendingPayment();
        const intervalId = window.setInterval(checkPendingPayment, PENDING_PAYMENT_POLL_MS);
        const onFocus = () => { checkPendingPayment(); };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkPendingPayment();
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [awaitingBrowserPayment, verifyPendingPayment]);

    // Submit logic
    function submit(amountInNaira: number) {
        if (!amountInNaira || Number.isNaN(amountInNaira) || amountInNaira < MIN_TOP_UP_NAIRA) {
            toast.error(`Enter a valid amount (minimum ₦${MIN_TOP_UP_NAIRA})`);
            return;
        }
        if (!email) {
            toast.error('Could not determine user email. Please try again.');
            return;
        }
        handleSubmit(amountInNaira.toString(), email);
    }

    async function handleSubmit(amountInNaira: string, email: string) {
        setUpdating(true);
        try {
            const response = await serverCall({
                serverCallProps: {
                    call: serverCalls.postGatewayPaystackTransactionInitiate,
                    data: {
                        amountInNaira,
                        email,
                        callbackUrl: buildPaymentCallbackUrl(amountInNaira, reopenTarget)
                    },
                },
                authorized: true,
            }) as PaystackInitResponse;


            if (!response.dataReturned.data) {
                throw new Error('Failed to initialize transaction');
            }

            const { data, reference: topLevelReference } = response.dataReturned;
            const reference = topLevelReference || data.reference;

            if (data.authorization_url) {
                const checkoutMode = openPaystackAuthorizationUrl(data.authorization_url);
                if (checkoutMode === 'external') {
                    if (!reference) {
                        setUpdating(false);
                        toast.error('Paystack did not return a payment reference. Please try again.');
                        return;
                    }
                    walletBeforeTopUpRef.current = wallet;
                    saveWalletTopUpPendingState({
                        reference,
                        amountInNaira,
                        startedAt: Date.now(),
                        reopenTarget,
                    });
                    setUpdating(false);
                    setAwaitingBrowserPayment(true);
                    toast.success('Complete payment in your browser. We will update your balance when it is confirmed.');
                    return;
                }
                return;
            }

            setUpdating(false);
            toast.error("Paystack did not return a payment URL. Please try again.");
        } catch (error) {

            setUpdating(false);
            toast.error('Failed to initialize payment. Please try again.');
            console.error('Payment initialization error:', error);
        }
    }

    // Escape key closes modal
    useEffect(() => {
        if (typeof window === 'undefined') return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') closeModal();
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [closeModal]);

    // Modal content
    const modalContent = (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-all duration-300 ease-out animate-fadeIn"
            onClick={e => {
                if (e.target === e.currentTarget) closeModal();
            }}
        >
            <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-[367px] max-[800px]:max-w-[320px] max-[800px]:mx-4 overflow-hidden flex flex-col border border-white/40 relative animate-slideUp text-gray-900 [color-scheme:light]">
                <button
                    className="absolute top-1 right-1 text-gray-400 hover:text-red-500 transition-colors duration-200 p-0.5 z-10 rounded-full focus:outline-none focus:ring-2 focus:ring-red-300"
                    onClick={closeModal}
                    aria-label="Close modal"
                    tabIndex={0}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
                {/* Insufficient funds warning */}
                {showInsufficientFundsWarning && (
                    <div className="bg-red-500 text-white text-xs px-2 py-2 rounded shadow mb-3 mx-auto mt-4 max-w-xs text-center z-50">
                        {insufficientFundsMessage || 'You need more credits to use this model.'}
                    </div>
                )}
                <div className="flex flex-col items-center justify-center w-full min-h-[210px] p-10 max-[800px]:p-6 max-[800px]:min-h-[180px]">
                    {/* Balance Section */}
                    <div className="w-full flex flex-col items-center mb-3 bg-blue-50/60 border border-blue-100 rounded-lg py-3 max-[800px]:py-2 shadow-sm">
                        <span className="text-[11px] text-gray-500 mb-0.5 flex items-center gap-1">
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block text-blue-400 mr-1" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 3v4" /><path d="M8 3v4" /></svg>
                            Present Credits
                        </span>
                        <div className="w-full flex items-center justify-center mb-1">
                            {loadingCredits ? (
                                <span className="text-blue-400 text-2xl font-bold animate-pulse">Loading...</span>
                            ) : (
                                <span className="text-blue-700 text-3xl max-[800px]:text-2xl font-extrabold tracking-tight">{addCommas(wallet ?? 0)} credits</span>
                            )}
                        </div>
                        {/* Info line for credit/naira/dollar equivalence */}
                        <span className="text-[12px] text-gray-700 font-medium bg-gray-100 rounded px-2 py-1 mt-2 mb-1 border border-gray-200 shadow-sm flex items-center gap-1" tabIndex={0} aria-label="Credit to Naira and Dollar equivalence">
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline-block text-blue-400 mr-1" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="8" /></svg>
                            1 credit = ₦1.00 ≈ $0.00063
                        </span>
                    </div>
                    {/* Input and Add Money always available */}
                    <form className="w-full flex flex-row items-center mb-2 mt-1" onSubmit={e => { e.preventDefault(); submit(parsedAmount); }}>
                        <input
                            type="text"
                            inputMode="numeric"
                            name="amount"
                            placeholder="Amount (₦)"
                            value={amount}
                            aria-label="Amount in Naira"
                            autoComplete="off"
                            onChange={(e) => {
                                const numberValue = e.target.value.replace(/[^0-9]/g, "");
                                setAmount(numberValue);
                            }}
                            className="flex-1 h-[44px] max-[800px]:h-[40px] px-3 text-base max-[800px]:text-sm font-semibold text-gray-900 bg-white border border-[#CBD5E1] rounded-l-md rounded-r-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 placeholder:text-gray-500 shadow-sm"
                            style={{
                                textAlign: "center",
                                borderRight: "none",
                            }}
                        />
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-semibold h-[44px] max-[800px]:h-[40px] px-5 max-[800px]:px-3 rounded-r-md transition disabled:opacity-60 text-base max-[800px]:text-sm whitespace-nowrap border border-l-0 border-[#DFE5EC] flex items-center justify-center"
                            style={{
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                marginLeft: '-1px',
                                minWidth: '110px',
                            }}
                            disabled={paymentModalLoading || updating || verifyingPayment || !canSubmitAmount}
                            aria-label="Add Money"
                        >
                            {(updating || paymentModalLoading || verifyingPayment) ? (
                                <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                            ) : null}
                            Add Money
                        </button>
                    </form>
                    {/* Helper text for min amount */}
                    <span className="text-[10px] text-gray-500 mt-0.5 mb-1">Minimum top-up: ₦200</span>
                    {updating && (
                        <div className="mt-2 text-blue-600 text-xs">Starting payment...</div>
                    )}
                    {awaitingBrowserPayment && (
                        <div className="mt-2 text-blue-600 text-xs text-center">
                            {verifyingPayment
                                ? 'Checking payment confirmation...'
                                : 'Complete payment in your browser. We will update your balance automatically.'}
                        </div>
                    )}
                </div>
            </div>
            <style jsx>{`
                .animate-fadeIn { animation: fadeIn 0.4s; }
                .animate-slideUp { animation: slideUp 0.4s; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );

    if (typeof window !== "undefined" && typeof document !== "undefined") {
        return (ReactDOM as any).createPortal(modalContent, document.body);
    }
    return null;
};

export default AddToWallet; 
