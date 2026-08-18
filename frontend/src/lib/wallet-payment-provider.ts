export type WalletPaymentProvider = 'paystack' | 'payaza';

export function getWalletPaymentProvider(): WalletPaymentProvider {
    const configured = (
        process.env.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER
        || process.env.WALLET_PAYMENT_PROVIDER
        || 'paystack'
    ).trim().toLowerCase();

    return configured === 'payaza' ? 'payaza' : 'paystack';
}

export function isPayazaWalletProvider(): boolean {
    return getWalletPaymentProvider() === 'payaza';
}
