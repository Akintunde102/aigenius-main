import {
    buildPayazaHostedCheckoutUrl,
    PAYAZA_HOSTED_CHECKOUT_BASE_URL,
    resolvePayazaCheckoutPublicKey,
    type PayazaCheckoutConfig,
} from '../payaza-checkout';

const baseCheckout: PayazaCheckoutConfig = {
    checkoutAmount: 12.5,
    currencyCode: 'USD',
    emailAddress: 'user@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    phoneNumber: '+2347012345678',
    transactionReference: 'tx_test_ref',
    connectionMode: 'Test',
};

describe('buildPayazaHostedCheckoutUrl', () => {
    it('builds a hosted checkout URL with redirect_url as the final parameter', () => {
        const url = buildPayazaHostedCheckoutUrl({
            publicKey: 'PZ78-PKTEST-key',
            checkout: baseCheckout,
            redirectUrl: 'https://app.example.com/payment-callback?returnTo=%2Fchat',
        });

        expect(url.startsWith(PAYAZA_HOSTED_CHECKOUT_BASE_URL)).toBe(true);
        expect(url).toContain('merchant_key=PZ78-PKTEST-key');
        expect(url).toContain('connection_mode=test');
        expect(url).toContain('checkout_amount=12.5');
        expect(url).toContain('currency_code=USD');
        expect(url).toContain('email_address=user%40example.com');
        expect(url).toContain('transaction_reference=tx_test_ref');
        expect(url.endsWith(
            encodeURIComponent('https://app.example.com/payment-callback?returnTo=%2Fchat'),
        )).toBe(true);
        expect(url.indexOf('redirect_url=')).toBeGreaterThan(url.indexOf('transaction_reference='));
    });

    it('includes biller_name when businessName is set on checkout config', () => {
        const url = buildPayazaHostedCheckoutUrl({
            publicKey: 'PZ78-PKTEST-key',
            checkout: { ...baseCheckout, businessName: 'AIGenius' },
            redirectUrl: 'https://app.example.com/payment-callback',
        });

        expect(url).toContain('biller_name=AIGenius');
        expect(url.indexOf('biller_name=')).toBeLessThan(url.indexOf('redirect_url='));
    });
});

describe('resolvePayazaCheckoutPublicKey', () => {
    it('prefers the API public key over the baked env key', () => {
        expect(resolvePayazaCheckoutPublicKey('PZ78-PKLIVE-from-api', 'PZ78-PKTEST-env')).toBe(
            'PZ78-PKLIVE-from-api',
        );
    });

    it('falls back to env when the API omits publicKey', () => {
        expect(resolvePayazaCheckoutPublicKey(undefined, 'PZ78-PKTEST-env')).toBe('PZ78-PKTEST-env');
    });
});
