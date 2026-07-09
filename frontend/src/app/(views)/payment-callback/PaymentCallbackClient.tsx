'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';
import {
    clearWalletTopUpReturnState,
    readWalletTopUpReturnState,
    saveWalletTopUpResultState,
} from '@/lib/wallet-payment-return';

type VerifyPaymentResponse = {
    status: 'success' | 'already_processed' | 'failed' | string;
    message?: string;
    amount?: number;
    newWalletBalance?: number | null;
};

type ServerCallEnvelope<T> = {
    dataReturned: T;
};

export default function PaymentCallbackClient() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'confirming'>('loading');

    useEffect(() => {
        let cancelled = false;

        async function verifyAndReturn() {
            const reference = searchParams.get('reference') || searchParams.get('trxref');
            const returnState = readWalletTopUpReturnState();
            const returnTo = searchParams.get('returnTo') || returnState?.returnTo || '/';

            if (!reference) {
                console.error("PaymentCallback: No reference found in URL query parameters.");
                saveWalletTopUpResultState({
                    status: 'failed',
                    reference: null,
                    amountInNaira: returnState?.amountInNaira,
                    message: 'Paystack did not return a transaction reference.',
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });
                setStatus('failed');
                toast.error('Payment verification failed.');
                window.setTimeout(() => window.location.replace(returnTo), 1200);
                return;
            }

            console.log(`PaymentCallback: Landed on callback page with reference: ${reference}`);

            try {
                // Step 1: Active reconciliation. Call verify endpoint once to trigger backend verification
                try {
                    console.log(`PaymentCallback: Triggering active verification check on backend for reference: ${reference}`);
                    const activeVerifyRes = await serverCall({
                        serverCallProps: {
                            call: serverCalls.postGatewayPaystackTransactionVerify,
                        },
                        pathArgs: { reference },
                        authorized: true,
                    });
                    console.log("PaymentCallback: Active verify trigger finished response:", activeVerifyRes);
                } catch (verifyError) {
                    console.warn("PaymentCallback: Active verify trigger endpoint threw error (might be resolved via webhook already or server issue):", verifyError);
                }

                // Step 2: Exponential backoff polling on the read-only status endpoint
                const backoffDelays = [1000, 2000, 4000, 8000, 16000];
                let isConfirmed = false;
                let finalVerification: VerifyPaymentResponse | null = null;

                console.log(`PaymentCallback: Starting status polling checks. Delays: ${backoffDelays.join("ms, ")}ms`);

                for (let i = 0; i < backoffDelays.length; i++) {
                    if (cancelled) return;
                    
                    console.log(`PaymentCallback: Polling status check iteration ${i + 1}/${backoffDelays.length} in ${backoffDelays[i]}ms...`);
                    // Wait for backoff delay before checking status
                    await new Promise(resolve => setTimeout(resolve, backoffDelays[i]));
                    if (cancelled) return;

                    try {
                        const statusResponse = await serverCall({
                            serverCallProps: {
                                call: serverCalls.getGatewayPaystackTransactionStatus,
                            },
                            pathArgs: { reference },
                            authorized: true,
                        }) as ServerCallEnvelope<VerifyPaymentResponse>;

                        const data = statusResponse.dataReturned;
                        console.log(`PaymentCallback: Polling status check result - Status: "${data.status}"`, data);

                        if (data.status === 'successful' || data.status === 'success') {
                            console.log("PaymentCallback: Payment confirmed successfully!");
                            isConfirmed = true;
                            finalVerification = data;
                            break;
                        } else if (data.status === 'failed') {
                            console.error("PaymentCallback: Transaction marked as FAILED in database.");
                            throw new Error(data.message || 'Payment failed on Paystack.');
                        }
                    } catch (statusError) {
                        // If it's a hard transaction failure, we throw
                        if (statusError instanceof Error && statusError.message.includes('failed')) {
                            throw statusError;
                        }
                        // Otherwise, we log and keep polling
                        console.warn(`PaymentCallback: Status check polling iteration ${i + 1} failed:`, statusError);
                    }
                }

                if (cancelled) return;

                if (isConfirmed && finalVerification) {
                    console.log("PaymentCallback: Saving wallet top up success state and returning.");
                    clearUserDetailsCache();
                    clearWalletTopUpReturnState();
                    saveWalletTopUpResultState({
                        status: 'success',
                        reference,
                        amountInNaira: returnState?.amountInNaira ?? (
                            typeof finalVerification.amount === 'number' ? String(finalVerification.amount) : undefined
                        ),
                        newWalletBalance: finalVerification.newWalletBalance ?? null,
                        message: finalVerification.message || 'Payment verified. Your wallet has been updated.',
                        verifiedAt: Date.now(),
                        reopenTarget: returnState?.reopenTarget,
                    });

                    setStatus('success');
                    toast.success('Payment verified. Returning to your wallet.');
                    window.setTimeout(() => window.location.replace(returnTo), 900);
                } else {
                    console.warn("PaymentCallback: Polling timed out. Transitioning to confirming state.");
                    // Step 3: Still pending after backoff, show "Confirming" screen with a return button
                    saveWalletTopUpResultState({
                        status: 'pending',
                        reference,
                        amountInNaira: returnState?.amountInNaira,
                        message: 'We are still confirming your payment with Paystack. Your wallet balance will update automatically.',
                        verifiedAt: Date.now(),
                        reopenTarget: returnState?.reopenTarget,
                    });
                    setStatus('confirming');
                }
            } catch (error) {
                if (cancelled) return;

                console.error("PaymentCallback: Fatal verification error encountered:", error);
                const message = error instanceof Error
                    ? error.message
                    : typeof error === 'string'
                        ? error
                        : 'Payment verification failed.';

                saveWalletTopUpResultState({
                    status: 'failed',
                    reference,
                    amountInNaira: returnState?.amountInNaira,
                    message,
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });

                setStatus('failed');
                toast.error(message);
                window.setTimeout(() => window.location.replace(returnTo), 2500);
            }
        }

        void verifyAndReturn();

        return () => {
            cancelled = true;
        };
    }, [searchParams]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Processing payment...</p>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
                    <p className="text-gray-600 mb-4">Your wallet has been verified and updated.</p>
                    <p className="text-sm text-gray-500">Returning you to your wallet...</p>
                </div>
            </div>
        );
    }

    if (status === 'confirming') {
        const returnState = readWalletTopUpReturnState();
        const returnTo = searchParams.get('returnTo') || returnState?.returnTo || '/';

        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Confirming Payment</h1>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        We are still confirming your payment with Paystack. This usually takes a few minutes. 
                        You don't need to wait on this page—your wallet balance will update automatically once confirmed.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            window.location.replace(returnTo);
                        }}
                        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Return to Wallet
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
                <p className="text-gray-600 mb-4">There was an issue processing your payment.</p>
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = '/';
                    }}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                    Return to App
                </button>
            </div>
        </div>
    );
}
