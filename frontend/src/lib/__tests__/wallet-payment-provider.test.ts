import { getWalletPaymentProvider, isFlutterwaveWalletProvider, isPayazaWalletProvider } from '../wallet-payment-provider';

describe('getWalletPaymentProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER;
    delete process.env.WALLET_PAYMENT_PROVIDER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('selects flutterwave from NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER', () => {
    process.env.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER = 'flutterwave';
    expect(getWalletPaymentProvider()).toBe('flutterwave');
    expect(isFlutterwaveWalletProvider()).toBe(true);
    expect(isPayazaWalletProvider()).toBe(false);
  });

  it('selects payaza when that provider is configured', () => {
    process.env.NEXT_PUBLIC_WALLET_PAYMENT_PROVIDER = 'payaza';
    expect(getWalletPaymentProvider()).toBe('payaza');
    expect(isPayazaWalletProvider()).toBe(true);
  });

  it('defaults to paystack when unset', () => {
    expect(getWalletPaymentProvider()).toBe('paystack');
  });
});
