import { openWalletPaymentCheckout } from '@/lib/wallet-payment-return';

export type PayazaCheckoutConfig = {
    checkoutAmount: number;
    currencyCode: 'NGN' | 'USD';
    emailAddress: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    transactionReference: string;
    connectionMode: 'Test' | 'Live';
    /** Overrides the merchant name shown on Payaza checkout. */
    businessName?: string;
};

/** Payaza hosted payment page — full browser checkout with redirect back to the app. */
export const PAYAZA_HOSTED_CHECKOUT_BASE_URL = 'https://payment.payaza.africa/';

export type BuildPayazaHostedCheckoutUrlOptions = {
    publicKey: string;
    checkout: PayazaCheckoutConfig;
    /** Must be the final Payaza parameter; customer returns here after payment. */
    redirectUrl: string;
};

type PayazaHostedCheckoutParam = readonly [string, string];

function mapHostedConnectionMode(mode: PayazaCheckoutConfig['connectionMode']): string {
    return mode === 'Live' ? 'live' : 'test';
}

function resolveCheckoutBusinessName(checkout: PayazaCheckoutConfig): string | undefined {
    const fromCheckout = checkout.businessName?.trim();
    if (fromCheckout) {
        return fromCheckout;
    }

    const fromEnv = process.env.NEXT_PUBLIC_PAYAZA_CHECKOUT_BUSINESS_NAME?.trim();
    return fromEnv || undefined;
}

/**
 * Builds the Payaza hosted checkout URL (payment page redirect).
 * @see https://docs.payaza.africa/api-reference/libraries/paymentpage
 */
export function buildPayazaHostedCheckoutUrl(
    options: BuildPayazaHostedCheckoutUrlOptions,
): string {
    const checkoutBusinessName = resolveCheckoutBusinessName(options.checkout);

    const params: PayazaHostedCheckoutParam[] = [
        ['merchant_key', options.publicKey.trim()],
        ['connection_mode', mapHostedConnectionMode(options.checkout.connectionMode)],
        ['checkout_amount', String(Number(options.checkout.checkoutAmount))],
        ['currency_code', options.checkout.currencyCode],
        ['email_address', options.checkout.emailAddress.trim()],
        ['first_name', options.checkout.firstName.trim()],
        ['last_name', options.checkout.lastName.trim()],
        ['phone_number', options.checkout.phoneNumber.trim()],
        ['transaction_reference', options.checkout.transactionReference.trim()],
    ];

    if (checkoutBusinessName) {
        params.push(['biller_name', checkoutBusinessName]);
    }

    const queryWithoutRedirect = params
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

    // Payaza requires redirect_url to be the last query parameter when present.
    const redirect = encodeURIComponent(options.redirectUrl.trim());
    return `${PAYAZA_HOSTED_CHECKOUT_BASE_URL}?${queryWithoutRedirect}&redirect_url=${redirect}`;
}

/**
 * Prefer the merchant key returned by the API (matches connectionMode + server env).
 * Fall back to NEXT_PUBLIC_PAYAZA_PUBLIC_KEY for older backends / local dev.
 */
export function resolvePayazaCheckoutPublicKey(
    apiPublicKey: string | null | undefined,
    envPublicKey: string | undefined = process.env.NEXT_PUBLIC_PAYAZA_PUBLIC_KEY,
): string {
    const fromApi = apiPublicKey?.trim();
    if (fromApi) {
        return fromApi;
    }
    return envPublicKey?.trim() || '';
}

export type OpenPayazaHostedWalletCheckoutOptions = BuildPayazaHostedCheckoutUrlOptions;

/**
 * Opens Payaza hosted checkout in the browser (same-tab on web, system browser on desktop).
 * @returns the checkout URL that was opened.
 */
export function openPayazaHostedWalletCheckout(
    options: OpenPayazaHostedWalletCheckoutOptions,
): string {
    const checkoutUrl = buildPayazaHostedCheckoutUrl(options);
    openWalletPaymentCheckout(checkoutUrl);
    return checkoutUrl;
}
