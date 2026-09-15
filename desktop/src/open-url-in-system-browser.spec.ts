import { shell } from 'electron';
import { openWalletCheckoutInSystemBrowser } from './open-url-in-system-browser';

jest.mock('electron', () => ({
  shell: {
    openExternal: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('openWalletCheckoutInSystemBrowser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens valid https checkout URLs without approval', async () => {
    const url = 'https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-test';
    const result = await openWalletCheckoutInSystemBrowser(url);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
  });

  it('rejects non-http URLs', async () => {
    const result = await openWalletCheckoutInSystemBrowser('javascript:alert(1)');

    expect(result).toEqual({ ok: false, error: 'invalid_url' });
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('trims whitespace before opening', async () => {
    const url = 'https://checkout.flutterwave.com/v3/hosted/pay/flwlnk-test';
    const result = await openWalletCheckoutInSystemBrowser(`  ${url}  `);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
  });
});
