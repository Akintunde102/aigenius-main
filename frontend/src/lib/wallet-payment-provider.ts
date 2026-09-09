export type WalletPaymentProvider = 'paystack' | 'payaza' | 'flutterwave';

export function getWalletPaymentProvider(): WalletPaymentProvider {
    const configured = (
        process.env.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER
        || process.env.WALLET_PAYMENT_PROVIDER
        || 'paystack'
    ).trim().toLowerCase();

    if (configured === 'payaza') return 'payaza';
    if (configured === 'flutterwave') return 'flutterwave';
    return 'paystack';
}

export function isPayazaWalletProvider(): boolean {
    return getWalletPaymentProvider() === 'payaza';
}

export function isFlutterwaveWalletProvider(): boolean {
    return getWalletPaymentProvider() === 'flutterwave';
}
