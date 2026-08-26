import { isHostedPaymentUrl } from './payment-allowlist';

describe('isHostedPaymentUrl', () => {
  it('accepts Paystack hosted checkout URLs', () => {
    expect(isHostedPaymentUrl('https://checkout.paystack.com/abc123')).toBe(true);
  });

  it('accepts Payaza hosted checkout URLs', () => {
    expect(isHostedPaymentUrl('https://payment.payaza.africa/?merchant_key=test')).toBe(true);
  });

  it('rejects unrelated external URLs', () => {
    expect(isHostedPaymentUrl('https://example.com/pay')).toBe(false);
  });
});
