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
    const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

    useEffect(() => {
        let cancelled = false;

        async function verifyAndReturn() {
            const reference = searchParams.get('reference') || searchParams.get('trxref');
            const returnState = readWalletTopUpReturnState();
            const returnTo = searchParams.get('returnTo') || returnState?.returnTo || '/';

            if (!reference) {
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

            try {
                const response = await serverCall({
                    serverCallProps: {
                        call: serverCalls.postGatewayPaystackTransactionVerify,
                        data: { reference },
                    },
                    authorized: true,
                }) as ServerCallEnvelope<VerifyPaymentResponse>;

                if (cancelled) return;

                const verification = response.dataReturned;
                const isVerified = verification.status === 'success'
                    || verification.status === 'already_processed';

                if (!isVerified) {
                    throw new Error(verification.message || 'Payment verification failed.');
                }

                clearUserDetailsCache();
                clearWalletTopUpReturnState();
                saveWalletTopUpResultState({
                    status: 'success',
                    reference,
                    amountInNaira: returnState?.amountInNaira ?? (
                        typeof verification.amount === 'number' ? String(verification.amount) : undefined
                    ),
                    newWalletBalance: verification.newWalletBalance ?? null,
                    message: verification.message || 'Payment verified. Your wallet has been updated.',
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });

                setStatus('success');
                toast.success('Payment verified. Returning to your wallet.');
                window.setTimeout(() => window.location.replace(returnTo), 900);
            } catch (error) {
                if (cancelled) return;

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
                window.setTimeout(() => window.location.replace(returnTo), 1600);
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
