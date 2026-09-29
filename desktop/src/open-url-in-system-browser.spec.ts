import { shell } from 'electron';
import { showExternalLinkApprovalDialog } from './external-link-approval-dialog';
import {
  isLoopbackPublishedConversationUrl,
  openClickedHttpUrlInSystemBrowser,
  openUrlInSystemBrowser,
  openWalletCheckoutInSystemBrowser,
} from './open-url-in-system-browser';

jest.mock('electron', () => ({
  shell: {
    openExternal: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('./external-link-approval-dialog', () => ({
  showExternalLinkApprovalDialog: jest.fn().mockResolvedValue(true),
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

describe('isLoopbackPublishedConversationUrl', () => {
  it('accepts a loopback published conversation page', () => {
    expect(
      isLoopbackPublishedConversationUrl('http://127.0.0.1:23001/published-conversations/abc'),
    ).toBe(true);
  });

  it('rejects published conversation pages on other hosts', () => {
    expect(
      isLoopbackPublishedConversationUrl('https://example.com/published-conversations/abc'),
    ).toBe(false);
  });

  it('rejects other loopback paths', () => {
    expect(isLoopbackPublishedConversationUrl('http://127.0.0.1:23001/chat')).toBe(false);
  });
});

describe('openClickedHttpUrlInSystemBrowser', () => {
  const approvalDialog = showExternalLinkApprovalDialog as jest.MockedFunction<
    typeof showExternalLinkApprovalDialog
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a clicked https link in the system browser without approval', async () => {
    const url = 'https://example.com/docs?q=1';
    const result = await openClickedHttpUrlInSystemBrowser(`  ${url}  `);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
    expect(approvalDialog).not.toHaveBeenCalled();
  });

  it('rejects javascript and mailto urls', async () => {
    expect(await openClickedHttpUrlInSystemBrowser('javascript:alert(1)')).toEqual({
      ok: false,
      error: 'invalid_url',
    });
    expect(await openClickedHttpUrlInSystemBrowser('mailto:nobox.hq@gmail.com')).toEqual({
      ok: false,
      error: 'invalid_url',
    });
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});

describe('openUrlInSystemBrowser', () => {
  const approvalDialog = showExternalLinkApprovalDialog as jest.MockedFunction<
    typeof showExternalLinkApprovalDialog
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens a loopback published conversation in the system browser without approval', async () => {
    const url = 'http://127.0.0.1:23001/published-conversations/abc';
    const result = await openUrlInSystemBrowser(url);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
    expect(approvalDialog).not.toHaveBeenCalled();
  });

  it('opens trusted official documentation URLs directly without approval', async () => {
    const url = 'https://aigenius.noboxlabs.xyz/docs/terms-and-conditions';
    const result = await openUrlInSystemBrowser(url);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
    expect(approvalDialog).not.toHaveBeenCalled();
  });

  it('opens mailto links directly in the system mail client without approval', async () => {
    const url = 'mailto:nobox.hq@gmail.com?subject=Support';
    const result = await openUrlInSystemBrowser(url);

    expect(result).toEqual({ ok: true });
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
    expect(approvalDialog).not.toHaveBeenCalled();
  });

  it('still asks before opening an unrelated external url', async () => {
    const url = 'https://example.com/docs';
    const result = await openUrlInSystemBrowser(url);

    expect(result).toEqual({ ok: true });
    expect(approvalDialog).toHaveBeenCalledWith(undefined, url);
    expect(shell.openExternal).toHaveBeenCalledWith(url, { activate: true });
  });

  it('does not open the browser when the user declines an external url', async () => {
    approvalDialog.mockResolvedValueOnce(false);
    const result = await openUrlInSystemBrowser('https://example.com/docs');

    expect(result).toEqual({ ok: false, error: 'user_declined' });
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});
