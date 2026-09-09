import { openWalletPaymentCheckout } from '@/lib/wallet-payment-return';

/** Opens the Flutterwave hosted checkout URL in the browser (or system browser on desktop). */
export function openFlutterwaveHostedWalletCheckout(checkoutLink: string): string {
    openWalletPaymentCheckout(checkoutLink);
    return checkoutLink;
}
