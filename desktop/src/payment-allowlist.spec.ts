import { isHostedPaymentUrl } from './payment-allowlist';

describe('isHostedPaymentUrl', () => {
  it('matches Flutterwave Standard hosted checkout', () => {
    expect(
      isHostedPaymentUrl(
        'https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-01hynrt7cd1fpm6gtef6khn93g',
      ),
    ).toBe(true);
  });

  it('matches Flutterwave .co hosts', () => {
    expect(isHostedPaymentUrl('https://checkout.flutterwave.co/pay/abc')).toBe(true);
  });

  it('matches Paystack and Payaza checkout hosts', () => {
    expect(isHostedPaymentUrl('https://checkout.paystack.com/abc')).toBe(true);
    expect(isHostedPaymentUrl('https://standard.paystack.co/abc')).toBe(true);
    expect(isHostedPaymentUrl('https://checkout.payaza.africa/abc')).toBe(true);
  });

  it('rejects lookalike hosts that only share a suffix string', () => {
    expect(isHostedPaymentUrl('https://evilflutterwave.com/pay')).toBe(false);
    expect(isHostedPaymentUrl('https://paystack.com.evil.example/pay')).toBe(false);
  });

  it('rejects non-http(s) URLs', () => {
    expect(isHostedPaymentUrl('file:///etc/passwd')).toBe(false);
    expect(isHostedPaymentUrl('about:blank')).toBe(false);
  });
});
