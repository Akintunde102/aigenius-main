import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { InputField } from "@/app/lib/formatic/InputField";
import { addCommas } from "@/app/lib/utils";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import toast from "react-hot-toast";
import { clearUserDetailsCache, getUserDetails } from "@/lib/calls/get-logged-user-details";
import {
    buildPaymentCallbackUrl,
    consumeWalletTopUpResultState,
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

function parseAmountNaira(raw: string): number {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return 0;
    const parsed = Number.parseInt(digits, 10);
    return Number.isFinite(parsed) ? parsed : 0;
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
    const [loadingCredits, setLoadingCredits] = useState(true);
    const [wallet, setWallet] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [email, setEmail] = useState<string>("");

    // Fetch wallet on mount and after update
    const fetchWallet = async () => {
        setLoadingCredits(true);
        try {
            const user = await getUserDetails();
            setWallet(user?.config?.wallet ?? null);
            setEmail(user?.email ?? "");
        } catch {
            setWallet(null);
        } finally {
            setLoadingCredits(false);
        }
    };
    useEffect(() => { fetchWallet(); }, []);

    const parsedAmount = parseAmountNaira(amount);
    const canSubmitAmount = parsedAmount >= MIN_TOP_UP_NAIRA;

    useEffect(() => {
        const paymentResult = consumeWalletTopUpResultState();
        if (!paymentResult) return;

        setUpdating(false);
        clearUserDetailsCache();

        if (paymentResult.status === 'success') {
            const amountInNaira = paymentResult.amountInNaira || amount;
            if (paymentResult.amountInNaira) {
                setAmount(paymentResult.amountInNaira);
            }
            if (typeof paymentResult.newWalletBalance === 'number') {
                setWallet(paymentResult.newWalletBalance);
            } else {
                void fetchWallet();
            }
            setShowSuccess(true);
            toast.success(paymentResult.message || 'Payment verified. Your wallet has been updated.');
            void onSuccessfulPayment(
                amountInNaira,
                paymentResult.newWalletBalance ?? null,
                { keepModalOpen: true },
            );
            return;
        }

        toast.error(paymentResult.message || 'Payment verification failed. Please try again.');
    }, []);

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

            const { data } = response.dataReturned;

            if (data.authorization_url) {
                window.location.assign(data.authorization_url);
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
            <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-full max-w-[367px] max-[800px]:max-w-[320px] max-[800px]:mx-4 overflow-hidden flex flex-col border border-white/40 relative animate-slideUp">
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
                    {/* Success message if top-up was successful */}
                    {showSuccess && (
                        <div className="w-full flex flex-col items-center mb-2 animate-fadeIn">
                            <span className="text-green-600 font-semibold text-base mb-1 flex items-center gap-1">
                                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block text-green-500" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                                Top-up Successful!
                            </span>
                        </div>
                    )}
                    {/* Input and Add Money always available */}
                    <form className="w-full flex flex-row items-center mb-2 mt-1" onSubmit={e => { e.preventDefault(); submit(parsedAmount); }}>
                        <div style={{ flex: 1 }} className="max-[800px]:[&_input]:!h-[40px] max-[800px]:[&_input]:!text-sm">
                            <InputField
                                label=""
                                name="amount"
                                type="text"
                                placeholder="Amount (₦)"
                                value={amount ? addCommas(Number(amount)) : ""}
                                style={{
                                    textAlign: "center",
                                    height: "44px",
                                    fontSize: "16px",
                                    borderTopRightRadius: 0,
                                    borderBottomRightRadius: 0,
                                    borderRight: 'none',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                }}
                                aria-label="Amount in Naira"
                                onChange={(name: string, value: string) => {
                                    const numberValue = value.replace(/[^0-9]/g, "");
                                    setAmount(numberValue);
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-blue-500 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-semibold h-[44px] max-[800px]:h-[40px] px-5 max-[800px]:px-3 rounded-r-md transition disabled:opacity-60 text-base max-[800px]:text-sm whitespace-nowrap border border-l-0 border-[#DFE5EC] flex items-center justify-center"
                            style={{
                                borderTopLeftRadius: 0,
                                borderBottomLeftRadius: 0,
                                marginLeft: '-1px',
                                minWidth: '110px',
                            }}
                            disabled={paymentModalLoading || updating || !canSubmitAmount}
                            aria-label="Add Money"
                        >
                            {(updating || paymentModalLoading) ? (
                                <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                            ) : null}
                            Add Money
                        </button>
                    </form>
                    {/* Helper text for min amount */}
                    <span className="text-[10px] text-gray-500 mt-0.5 mb-1">Minimum top-up: ₦200</span>
                    {updating && <div className="mt-2 text-blue-600 text-xs">Please wait, updating your wallet...</div>}
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
