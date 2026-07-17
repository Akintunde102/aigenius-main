'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { syncAuthSessionCookiesFromStorage } from '@/lib/utils/auth-session';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';
import {
    clearWalletTopUpReturnState,
    clearPendingPaymentStorage,
    readWalletTopUpReturnState,
    resolveWalletPaymentReturnTarget,
    saveWalletTopUpResultState,
} from '@/lib/wallet-payment-return';
import { reconcilePaymentWithBackend } from '@/lib/wallet-pending-payment-poll';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';

type VerifyPaymentResponse = {
    status: string;
    message?: string;
    amount?: number | string;
    newWalletBalance?: number | null;
};

type ServerCallEnvelope<T> = {
    dataReturned: T;
};

const VERIFY_TRIGGER_KEY_PREFIX = 'aigenius:payment-verify-triggered:';

const STATUS_CARD =
    'mx-auto w-full max-w-md rounded-2xl border border-zinc-700/45 bg-zinc-950 px-8 py-10 text-center shadow-2xl shadow-black/35';

const PRIMARY_BUTTON =
    'inline-flex items-center justify-center rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.99]';

function StatusShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex w-full flex-1 flex-col items-center justify-center px-5 py-16 sm:px-8">
            {children}
        </div>
    );
}

function StatusIcon({
    tone,
    children,
}: {
    tone: 'loading' | 'success' | 'confirming' | 'failed';
    children: React.ReactNode;
}) {
    const toneClass =
        tone === 'success'
            ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_-8px_rgba(16,185,129,0.35)]'
            : tone === 'confirming'
              ? 'bg-amber-500/10 text-amber-400 shadow-[0_0_40px_-8px_rgba(245,158,11,0.3)]'
              : tone === 'failed'
                ? 'bg-red-500/10 text-red-400 shadow-[0_0_40px_-8px_rgba(248,113,113,0.3)]'
                : 'bg-cyan-500/10 text-cyan-400';

    return (
        <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center">
            {tone === 'success' ? (
                <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" aria-hidden />
            ) : null}
            <div
                className={cn(
                    'relative flex h-16 w-16 items-center justify-center rounded-full',
                    toneClass,
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function PaymentCallbackLoadingView() {
    return (
        <StatusShell>
            <div className={STATUS_CARD}>
                <StatusIcon tone="loading">
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                </StatusIcon>
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Processing payment
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Verifying your transaction with Paystack…
                </p>
            </div>
        </StatusShell>
    );
}

function isVerifiedPaymentStatus(status: string | undefined): boolean {
    return status === 'success'
        || status === 'successful'
        || status === 'already_processed';
}

function isRecordedPaymentFailure(status: string | undefined): boolean {
    return status === 'failed' || status === 'cancelled';
}

class PaymentFailedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PaymentFailedError';
    }
}

function extractServerData<T>(response: unknown): T | null {
    if (!response || typeof response !== 'object') {
        return null;
    }
    return (response as ServerCallEnvelope<T>).dataReturned ?? null;
}

async function fetchTransactionStatus(reference: string): Promise<VerifyPaymentResponse | null> {
    const statusResponse = await serverCall({
        serverCallProps: {
            call: serverCalls.getGatewayPaystackTransactionStatus,
        },
        pathArgs: { reference },
        authorized: true,
    });
    return extractServerData<VerifyPaymentResponse>(statusResponse);
}

async function triggerVerifyOnce(reference: string): Promise<VerifyPaymentResponse | null> {
    if (typeof window !== 'undefined') {
        const alreadyTriggered = window.sessionStorage.getItem(`${VERIFY_TRIGGER_KEY_PREFIX}${reference}`);
        if (alreadyTriggered) {
            return fetchTransactionStatus(reference);
        }
    }

    try {
        const verifyResponse = await serverCall({
            serverCallProps: {
                call: serverCalls.postGatewayPaystackTransactionVerify,
            },
            pathArgs: { reference },
            authorized: true,
        });
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(`${VERIFY_TRIGGER_KEY_PREFIX}${reference}`, String(Date.now()));
        }
        return extractServerData<VerifyPaymentResponse>(verifyResponse);
    } catch (verifyError) {
        console.warn('PaymentCallback: verify endpoint error (may already be processed via webhook):', verifyError);
        return fetchTransactionStatus(reference).catch(() => null);
    }
}

export default function PaymentCallbackClient() {
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'confirming'>('loading');

    useEffect(() => {
        let mounted = true;

        async function verifyAndReturn() {
            const reference = searchParams.get('reference') || searchParams.get('trxref');
            const returnState = readWalletTopUpReturnState();
            const returnTo = resolveWalletPaymentReturnTarget(
                searchParams.get('returnTo') || returnState?.returnTo,
            );

            const finishSuccess = (finalVerification: VerifyPaymentResponse) => {
                if (!mounted) return;

                clearUserDetailsCache();
                syncAuthSessionCookiesFromStorage();
                clearWalletTopUpReturnState();
                clearPendingPaymentStorage();
                saveWalletTopUpResultState({
                    status: 'success',
                    reference: reference!,
                    amountInNaira: returnState?.amountInNaira ?? (
                        finalVerification.amount != null ? String(finalVerification.amount) : undefined
                    ),
                    newWalletBalance: finalVerification.newWalletBalance ?? null,
                    message: finalVerification.message || 'Payment verified. Your wallet has been updated.',
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });

                setStatus('success');
                if (isAigeniusDesktopRuntime()) {
                    toast.success('Payment verified. Return to the app to see your updated balance.');
                } else {
                    toast.success('Payment verified. Returning to your wallet.');
                }
                if (!searchParams.get('desktop')) {
                    window.setTimeout(() => {
                        if (mounted) {
                            window.location.replace(returnTo);
                        }
                    }, 900);
                }
            };

            if (!reference) {
                console.error('PaymentCallback: No reference found in URL query parameters.');
                saveWalletTopUpResultState({
                    status: 'failed',
                    reference: null,
                    amountInNaira: returnState?.amountInNaira,
                    message: 'Paystack did not return a transaction reference.',
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });
                if (mounted) {
                    setStatus('failed');
                    toast.error('Payment verification failed.');
                    window.setTimeout(() => window.location.replace(returnTo), 1200);
                }
                return;
            }

            console.log(`PaymentCallback: Landed on callback page with reference: ${reference}`);

            const isDesktopHandoff = searchParams.get('desktop') === '1';

            try {
                let verifyData = await triggerVerifyOnce(reference);

                if (verifyData && isRecordedPaymentFailure(verifyData.status)) {
                    throw new PaymentFailedError(
                        verifyData.message || 'Payment failed on Paystack.',
                    );
                }

                if (!verifyData || !isVerifiedPaymentStatus(verifyData.status)) {
                    verifyData = await reconcilePaymentWithBackend(reference);
                }

                if (verifyData && isRecordedPaymentFailure(verifyData.status)) {
                    throw new PaymentFailedError(
                        verifyData.message || 'Payment failed on Paystack.',
                    );
                }

                if (verifyData && isVerifiedPaymentStatus(verifyData.status)) {
                    console.log('PaymentCallback: Payment confirmed.', verifyData);
                    finishSuccess(verifyData);
                    return;
                }

                if (isDesktopHandoff) {
                    console.log('PaymentCallback: Desktop handoff — payment not verified in browser yet.');
                    saveWalletTopUpResultState({
                        status: 'pending',
                        reference,
                        amountInNaira: returnState?.amountInNaira,
                        message: 'Return to the app — your wallet will update once payment is confirmed.',
                        verifiedAt: Date.now(),
                        reopenTarget: returnState?.reopenTarget,
                    });
                    if (mounted) {
                        setStatus('confirming');
                    }
                    return;
                }

                const backoffDelays = [0, 500, 1000, 2000, 4000, 8000];
                let finalVerification: VerifyPaymentResponse | null = null;

                for (let i = 0; i < backoffDelays.length; i++) {
                    if (!mounted) return;

                    if (backoffDelays[i] > 0) {
                        await new Promise((resolve) => setTimeout(resolve, backoffDelays[i]));
                    }
                    if (!mounted) return;

                    try {
                        const data = await reconcilePaymentWithBackend(reference);
                        if (!data) continue;

                        console.log(`PaymentCallback: Status poll ${i + 1} — "${data.status}"`, data);

                        if (isVerifiedPaymentStatus(data.status)) {
                            finalVerification = data;
                            break;
                        }

                        if (isRecordedPaymentFailure(data.status)) {
                            throw new PaymentFailedError(data.message || 'Payment failed on Paystack.');
                        }
                    } catch (statusError) {
                        if (statusError instanceof PaymentFailedError) {
                            throw statusError;
                        }
                        console.warn(`PaymentCallback: Status poll ${i + 1} failed:`, statusError);
                    }
                }

                if (!mounted) return;

                if (finalVerification) {
                    finishSuccess(finalVerification);
                    return;
                }

                console.warn('PaymentCallback: Polling timed out. Transitioning to confirming state.');
                saveWalletTopUpResultState({
                    status: 'pending',
                    reference,
                    amountInNaira: returnState?.amountInNaira,
                    message: 'We are still confirming your payment with Paystack. Your wallet balance will update automatically.',
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });
                setStatus('confirming');
            } catch (error) {
                if (!mounted) return;

                try {
                    const lastChance = await reconcilePaymentWithBackend(reference);
                    if (lastChance && isVerifiedPaymentStatus(lastChance.status)) {
                        finishSuccess(lastChance);
                        return;
                    }
                    if (lastChance && isRecordedPaymentFailure(lastChance.status)) {
                        throw new PaymentFailedError(lastChance.message || 'Payment failed on Paystack.');
                    }
                } catch (lastChanceError) {
                    if (lastChanceError instanceof PaymentFailedError) {
                        throw lastChanceError;
                    }
                    console.warn('PaymentCallback: Final status check failed:', lastChanceError);
                }

                console.error('PaymentCallback: Fatal verification error:', error);
                const message = error instanceof PaymentFailedError
                    ? error.message
                    : error instanceof Error
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
            mounted = false;
        };
    }, [searchParams]);

    if (status === 'loading') {
        return <PaymentCallbackLoadingView />;
    }

    if (status === 'success') {
        return (
            <StatusShell>
                <div className={STATUS_CARD}>
                    <StatusIcon tone="success">
                        <CheckCircle2 className="h-8 w-8" aria-hidden />
                    </StatusIcon>
                    <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Payment successful
                    </h1>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                        {searchParams.get('desktop') === '1'
                            ? 'Return to the app — your wallet will update automatically.'
                            : 'Your wallet has been verified and updated.'}
                    </p>
                    {searchParams.get('desktop') !== '1' ? (
                        <p className="mt-4 text-sm text-zinc-500">Returning you to your wallet…</p>
                    ) : null}
                </div>
            </StatusShell>
        );
    }

    if (status === 'confirming') {
        const returnState = readWalletTopUpReturnState();
        const returnTo = resolveWalletPaymentReturnTarget(
            searchParams.get('returnTo') || returnState?.returnTo,
        );
        const isDesktopHandoff = searchParams.get('desktop') === '1';

        return (
            <StatusShell>
                <div className={STATUS_CARD}>
                    <StatusIcon tone="confirming">
                        <AlertTriangle className="h-8 w-8" aria-hidden />
                    </StatusIcon>
                    <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                        Confirming payment
                    </h1>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                        {isDesktopHandoff
                            ? 'We could not verify your payment in this browser yet. Return to the app — it will confirm your payment and update your wallet automatically.'
                            : 'We could not verify your payment yet. You can wait here or return to your wallet — your balance will update automatically once Paystack confirms the payment.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            if (isDesktopHandoff) {
                                window.close();
                                return;
                            }
                            window.location.replace(returnTo);
                        }}
                        className={cn('mt-8', PRIMARY_BUTTON, FOCUS_RING)}
                    >
                        {isDesktopHandoff ? 'Close this tab' : 'Return to wallet'}
                    </button>
                </div>
            </StatusShell>
        );
    }

    return (
        <StatusShell>
            <div className={STATUS_CARD}>
                <StatusIcon tone="failed">
                    <XCircle className="h-8 w-8" aria-hidden />
                </StatusIcon>
                <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Payment failed
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    There was an issue processing your payment.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = '/';
                    }}
                    className={cn('mt-8', PRIMARY_BUTTON, FOCUS_RING)}
                >
                    Return to app
                </button>
            </div>
        </StatusShell>
    );
}
