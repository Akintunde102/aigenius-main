'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { hasAuthSession, syncAuthSessionCookiesFromStorage } from '@/lib/utils/auth-session';
import { isAigeniusDesktopRuntime, isDesktopPaymentBrowserHandoff } from '@/lib/utils/desktop-runtime';
import { serverCall } from '@/servercall/init';
import { serverCalls } from '@/servercall/store';
import {
    clearWalletTopUpReturnState,
    clearPendingPaymentStorage,
    readWalletTopUpReturnState,
    resolveWalletPaymentReference,
    resolveWalletPaymentReturnTarget,
    saveWalletTopUpResultState,
} from '@/lib/wallet-payment-return';
import {
    markPendingWalletCheckoutStarted,
    reconcilePaymentWithBackend,
    type WalletPaymentVerification,
} from '@/lib/wallet-pending-payment-poll';
import { LandingAmbientBackground } from '@/app/components/ui';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';

type VerifyPaymentResponse = WalletPaymentVerification;

type StatusTone = 'loading' | 'success' | 'confirming' | 'failed';

type ServerCallEnvelope<T> = {
    dataReturned: T;
};

const VERIFY_TRIGGER_KEY_PREFIX = 'aigenius:payment-verify-triggered:';

function StatusCard({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center"
        }}>
            {children}
        </div>
    );
}

function StatusShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="content-centered">
            {children}
        </div>
    );
}

function StatusIcon({
    tone,
    children,
}: {
    tone: StatusTone;
    children: React.ReactNode;
}) {
    const toneColors: Record<StatusTone, { border: string; bg: string; color: string }> = {
        loading: { border: "rgba(6, 182, 212, 0.2)", bg: "rgba(6, 182, 212, 0.1)", color: "#06b6d4" },
        success: { border: "rgba(16, 185, 129, 0.2)", bg: "rgba(16, 185, 129, 0.1)", color: "#10b981" },
        confirming: { border: "rgba(245, 158, 11, 0.2)", bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b" },
        failed: { border: "rgba(244, 63, 94, 0.2)", bg: "rgba(244, 63, 94, 0.1)", color: "#f43f5e" }
    };
    const colors = toneColors[tone];

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "3.5rem",
            height: "3.5rem",
            borderRadius: "1rem",
            border: `1px solid ${colors.border}`,
            background: colors.bg,
            color: colors.color,
            marginBottom: "1.5rem"
        }}>
            {children}
        </div>
    );
}

const PRIMARY_BUTTON =
    'mt-8 inline-flex items-center justify-center rounded-xl bg-[#18181b] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.99] border-none cursor-pointer';

export function PaymentCallbackLoadingView() {
    return (
        <StatusShell>
            <StatusCard tone="loading">
                <StatusIcon tone="loading">
                    <Loader2 size={32} className="animate-spin" aria-hidden />
                </StatusIcon>
                <h1 className="headline">
                    Processing payment
                </h1>
                <p className="subtext">
                    Verifying your transaction with your payment provider…
                </p>
            </StatusCard>
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

function resolveMissingReferenceMessage(): string {
    return 'The payment provider did not return a transaction reference.';
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
            call: serverCalls.getGatewayWalletTransactionStatus,
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
                call: serverCalls.postGatewayWalletTransactionVerify,
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
            syncAuthSessionCookiesFromStorage();

            const reference = resolveWalletPaymentReference(searchParams);
            if (reference) {
                markPendingWalletCheckoutStarted(reference);
            }
            const returnState = readWalletTopUpReturnState();
            const returnTo = resolveWalletPaymentReturnTarget(
                searchParams.get('returnTo') || returnState?.returnTo,
            );
            const isDesktopHandoff = searchParams.get('desktop') === '1';
            const lacksSessionForVerify = !hasAuthSession();
            const shouldDeferVerifyToApp =
                isDesktopPaymentBrowserHandoff(searchParams)
                || (lacksSessionForVerify && Boolean(reference));
            const shouldAutoReturn = !isDesktopHandoff && !shouldDeferVerifyToApp;

            const redirectAfterPayment = (delayMs: number) => {
                if (!shouldAutoReturn) {
                    return;
                }
                window.setTimeout(() => {
                    if (mounted) {
                        window.location.replace(returnTo);
                    }
                }, delayMs);
            };

            // System browser (or any callback surface without tokens) cannot call authorized
            // verify APIs — layout/getUserDetails or verify would trigger /login redirect.
            if (shouldDeferVerifyToApp) {
                if (!reference) {
                    if (isDesktopHandoff) {
                        console.log(
                            'PaymentCallback: Desktop handoff without reference — app will confirm payment.',
                        );
                        if (mounted) {
                            setStatus('confirming');
                            toast.success(
                                'Payment received. Return to AIGenius to see your updated balance.',
                            );
                        }
                        return;
                    }

                    saveWalletTopUpResultState({
                        status: 'failed',
                        reference: null,
                        amountInNaira: returnState?.amountInNaira,
                        message: resolveMissingReferenceMessage(),
                        verifiedAt: Date.now(),
                        reopenTarget: returnState?.reopenTarget,
                    });
                    if (mounted) {
                        setStatus('failed');
                        toast.error('Payment verification failed.');
                    }
                    return;
                }

                console.log(
                    `PaymentCallback: Deferring verify (reference=${reference}) — app polling or re-open with session.`,
                );
                if (mounted) {
                    setStatus('confirming');
                    toast.success('Payment received. Return to AIGenius to see your updated balance.');
                }
                return;
            }

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
                    redirectAfterPayment(900);
                }
            };

            if (!reference) {
                console.error('PaymentCallback: No reference found in URL query parameters.');
                saveWalletTopUpResultState({
                    status: 'failed',
                    reference: null,
                    amountInNaira: returnState?.amountInNaira,
                    message: resolveMissingReferenceMessage(),
                    verifiedAt: Date.now(),
                    reopenTarget: returnState?.reopenTarget,
                });
                if (mounted) {
                    setStatus('failed');
                    toast.error('Payment verification failed.');
                    redirectAfterPayment(1200);
                }
                return;
            }

            console.log(`PaymentCallback: Landed on callback page with reference: ${reference}`);

            try {
                let verifyData = await triggerVerifyOnce(reference);

                if (verifyData && isRecordedPaymentFailure(verifyData.status)) {
                    throw new PaymentFailedError(
                        verifyData.message || 'Payment failed.',
                    );
                }

                if (!verifyData || !isVerifiedPaymentStatus(verifyData.status)) {
                    verifyData = await reconcilePaymentWithBackend(reference);
                }

                if (verifyData && isRecordedPaymentFailure(verifyData.status)) {
                    throw new PaymentFailedError(
                        verifyData.message || 'Payment failed.',
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
                            throw new PaymentFailedError(data.message || 'Payment failed.');
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
                    message: 'We are still confirming your payment. Your wallet balance will update automatically.',
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
                        throw new PaymentFailedError(lastChance.message || 'Payment failed.');
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
                redirectAfterPayment(2500);
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
                <StatusCard tone="success">
                    <StatusIcon tone="success">
                        <CheckCircle2 size={32} aria-hidden />
                    </StatusIcon>
                    <h1 className="headline">
                        Payment successful
                    </h1>
                    <p className="subtext">
                        {searchParams.get('desktop') === '1'
                            ? 'Return to the app — your wallet will update automatically.'
                            : 'Your wallet has been verified and updated.'}
                    </p>
                    {searchParams.get('desktop') !== '1' ? (
                        <p className="subtext" style={{ marginTop: '0.5rem' }}>Returning you to your wallet…</p>
                    ) : null}
                </StatusCard>
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
                <StatusCard tone="confirming">
                    <StatusIcon tone="confirming">
                        <AlertTriangle size={32} aria-hidden />
                    </StatusIcon>
                    <h1 className="headline">
                        Confirming payment
                    </h1>
                    <p className="subtext">
                        {isDesktopHandoff
                            ? 'We could not verify your payment in this browser yet. Return to the app — it will confirm your payment and update your wallet automatically.'
                            : 'We could not verify your payment yet. You can wait here or return to your wallet — your balance will update automatically once payment is confirmed.'}
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
                        className={PRIMARY_BUTTON}
                    >
                        {isDesktopHandoff ? 'Close this tab' : 'Return to wallet'}
                    </button>
                </StatusCard>
            </StatusShell>
        );
    }

    return (
        <StatusShell>
            <StatusCard tone="failed">
                <StatusIcon tone="failed">
                    <XCircle size={32} aria-hidden />
                </StatusIcon>
                <h1 className="headline">
                    Payment failed
                </h1>
                <p className="subtext">
                    There was an issue processing your payment.
                </p>
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = '/';
                    }}
                    className={PRIMARY_BUTTON}
                >
                    Return to app
                </button>
            </StatusCard>
        </StatusShell>
    );
}
