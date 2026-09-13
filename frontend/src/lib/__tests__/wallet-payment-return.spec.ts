/**
 * @jest-environment jsdom
 */

import {
  openWalletPaymentCheckout,
  tryOpenWalletPaymentCheckout,
} from '@/lib/wallet-payment-return';

describe('tryOpenWalletPaymentCheckout', () => {
  beforeEach(() => {
    delete (window as { aigeniusDesktop?: unknown }).aigeniusDesktop;
  });

  it('opens checkout via desktop openExternal and reports success', async () => {
    const openExternal = jest.fn().mockResolvedValue({ opened: true });
    window.aigeniusDesktop = { isDesktop: true, openExternal };

    await expect(
      tryOpenWalletPaymentCheckout('https://checkout.flutterwave.com/v3/hosted/pay/abc'),
    ).resolves.toEqual({ opened: true });
    expect(openExternal).toHaveBeenCalledWith('https://checkout.flutterwave.com/v3/hosted/pay/abc');
  });

  it('reports when the desktop shell could not open the browser', async () => {
    window.aigeniusDesktop = {
      isDesktop: true,
      openExternal: jest.fn().mockResolvedValue({ opened: false, error: 'Link was not approved' }),
    };

    await expect(
      tryOpenWalletPaymentCheckout('https://checkout.flutterwave.com/v3/hosted/pay/abc'),
    ).resolves.toEqual({ opened: false, error: 'Link was not approved' });
  });

  it('treats a void openExternal (legacy preload) as opened', async () => {
    window.aigeniusDesktop = {
      isDesktop: true,
      openExternal: jest.fn().mockReturnValue(undefined),
    };

    await expect(
      tryOpenWalletPaymentCheckout('https://checkout.flutterwave.com/v3/hosted/pay/abc'),
    ).resolves.toEqual({ opened: true });
  });

  it('reports thrown desktop openExternal failures', async () => {
    window.aigeniusDesktop = {
      isDesktop: true,
      openExternal: jest.fn().mockRejectedValue(new Error('shell.openExternal failed')),
    };

    await expect(
      tryOpenWalletPaymentCheckout('https://checkout.flutterwave.com/v3/hosted/pay/abc'),
    ).resolves.toEqual({ opened: false, error: 'shell.openExternal failed' });
  });
});

describe('openWalletPaymentCheckout', () => {
  it('returns the checkout URL immediately', () => {
    window.aigeniusDesktop = {
      isDesktop: true,
      openExternal: jest.fn().mockResolvedValue({ opened: true }),
    };

    expect(openWalletPaymentCheckout('https://checkout.flutterwave.com/pay')).toBe(
      'https://checkout.flutterwave.com/pay',
    );
  });
});
