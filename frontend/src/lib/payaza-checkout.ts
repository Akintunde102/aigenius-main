import { markPendingWalletCheckoutStarted } from '@/lib/wallet-pending-payment-poll';

export type PayazaCheckoutConfig = {
    checkoutAmount: number;
    currencyCode: 'NGN';
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    transactionReference: string;
    connectionMode: 'Test' | 'Live';
    /** Overrides the merchant name shown on Payaza checkout. */
    businessName?: string;
};

export type PayazaCheckoutSuccessResponse = {
    type?: string;
    status?: number;
    data?: {
        message?: string;
        payaza_reference?: string;
        transaction_reference?: string;
    };
};

export type PayazaCheckoutErrorResponse = {
    type?: string;
    status?: number;
    data?: {
        message?: string;
    };
};

type OpenPayazaWalletCheckoutOptions = {
    publicKey: string;
    checkout: PayazaCheckoutConfig;
    onSuccess: (response: PayazaCheckoutSuccessResponse) => void;
    onError: (response: PayazaCheckoutErrorResponse) => void;
    onClose: () => void;
    onPopupOpen?: () => void;
};

const PAYAZA_CHECKOUT_SCRIPT_URL = 'https://checkout-v2.payaza.africa/js/v1/bundle.js';
const PAYAZA_CHECKOUT_SCRIPT_ID = 'payaza-checkout-sdk';

type PayazaCheckoutHandle = {
    setCallback: (callback: (response: PayazaCheckoutSuccessResponse | PayazaCheckoutErrorResponse) => void) => void;
    setOnClose: (callback: () => void) => void;
    showPopup: () => void;
};

type PayazaCheckoutGlobal = {
    setup: (config: Record<string, unknown>) => PayazaCheckoutHandle;
};

declare global {
    interface Window {
        PayazaCheckout?: PayazaCheckoutGlobal;
    }
}

let payazaScriptPromise: Promise<void> | null = null;

function loadPayazaCheckoutScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Payaza checkout is only available in the browser'));
    }

    if (window.PayazaCheckout) {
        return Promise.resolve();
    }

    if (payazaScriptPromise) {
        return payazaScriptPromise;
    }

    payazaScriptPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(PAYAZA_CHECKOUT_SCRIPT_ID) as HTMLScriptElement | null;
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Payaza checkout SDK')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.id = PAYAZA_CHECKOUT_SCRIPT_ID;
        script.src = PAYAZA_CHECKOUT_SCRIPT_URL;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Payaza checkout SDK'));
        document.head.appendChild(script);
    });

    return payazaScriptPromise;
}

function resolveCheckoutBusinessName(checkout: PayazaCheckoutConfig): string | undefined {
    const fromCheckout = checkout.businessName?.trim();
    if (fromCheckout) {
        return fromCheckout;
    }

    const fromEnv = process.env.NEXT_PUBLIC_PAYAZA_CHECKOUT_BUSINESS_NAME?.trim();
    return fromEnv || undefined;
}

export async function openPayazaWalletCheckout(
    options: OpenPayazaWalletCheckoutOptions,
): Promise<void> {
    await loadPayazaCheckoutScript();

    if (!window.PayazaCheckout) {
        throw new Error('Payaza checkout SDK is unavailable');
    }

    const checkoutBusinessName = resolveCheckoutBusinessName(options.checkout);
    const checkout = window.PayazaCheckout.setup({
        merchant_key: options.publicKey,
        connection_mode: options.checkout.connectionMode,
        checkout_amount: Number(options.checkout.checkoutAmount),
        currency_code: options.checkout.currencyCode,
        email_address: options.checkout.emailAddress,
        first_name: options.checkout.firstName,
        last_name: options.checkout.lastName,
        phone_number: options.checkout.phoneNumber,
        transaction_reference: options.checkout.transactionReference,
        ...(checkoutBusinessName ? { biller_name: checkoutBusinessName } : {}),
    });

    checkout.setCallback((response) => {
        if (response.type === 'success') {
            options.onSuccess(response as PayazaCheckoutSuccessResponse);
            return;
        }
        options.onError(response as PayazaCheckoutErrorResponse);
    });
    checkout.setOnClose(options.onClose);
    markPendingWalletCheckoutStarted(options.checkout.transactionReference);
    options.onPopupOpen?.();
    checkout.showPopup();
}
