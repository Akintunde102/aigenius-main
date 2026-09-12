import { isHostedPaymentUrl } from './payment-allowlist';

describe('isHostedPaymentUrl', () => {
  it('allows Paystack checkout', () => {
    expect(
      isHostedPaymentUrl('https://checkout.paystack.com/abcdef'),
    ).toBe(true);
  });

  it('allows Payaza hosted checkout', () => {
    expect(
      isHostedPaymentUrl('https://payment.payaza.africa/?merchant_key=pk_test'),
    ).toBe(true);
  });

  it('allows Flutterwave hosted checkout', () => {
    expect(
      isHostedPaymentUrl('https://checkout-v3.flutterwave.com/v3/hosted/pay/abc123'),
    ).toBe(true);
  });

  it('rejects unrelated external URLs', () => {
    expect(isHostedPaymentUrl('https://evil.example/phish')).toBe(false);
  });
});
