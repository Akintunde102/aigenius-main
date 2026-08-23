/**
 * @jest-environment jsdom
 */

import {
  appendWalletPaymentReferenceToCallbackUrl,
  clearPendingPaymentStorage,
  resolveWalletPaymentReference,
  WALLET_PENDING_PAYMENT_KEY,
} from '@/lib/wallet-payment-return';

const mockIsAigeniusDesktopRuntime = jest.fn();
const mockServerCall = jest.fn();

jest.mock('@/lib/utils/desktop-runtime', () => ({
  __esModule: true,
  isAigeniusDesktopRuntime: () => mockIsAigeniusDesktopRuntime(),
}));

jest.mock('@/servercall/init', () => ({
  __esModule: true,
  serverCall: (...args: unknown[]) => mockServerCall(...args),
}));

jest.mock('@/servercall/store', () => ({
  __esModule: true,
  serverCalls: {
    getGatewayWalletTransactionStatus: 'getGatewayWalletTransactionStatus',
    postGatewayWalletTransactionVerify: 'postGatewayWalletTransactionVerify',
  },
}));

jest.mock('@/lib/calls/get-logged-user-details', () => ({
  __esModule: true,
  clearUserDetailsCache: jest.fn(),
}));

jest.mock('@/lib/wallet-credits-migration', () => ({
  __esModule: true,
  notifyWalletCreditsUpdated: jest.fn(),
}));

describe('resolveWalletPaymentReference', () => {
  let memory: Record<string, string>;

  beforeEach(() => {
    memory = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
        setItem: (k: string, v: string) => {
          memory[k] = v;
        },
        removeItem: (k: string) => {
          delete memory[k];
        },
        clear: () => {
          memory = {};
        },
      },
      configurable: true,
    });
    clearPendingPaymentStorage();
  });

  it('prefers reference from the callback URL', () => {
    window.localStorage.setItem(
      WALLET_PENDING_PAYMENT_KEY,
      JSON.stringify({
        reference: 'pz_from_storage',
        amountInNaira: '1000',
        createdAt: Date.now(),
        provider: 'payaza',
      }),
    );

    const params = new URLSearchParams('reference=pz_from_url');
    expect(resolveWalletPaymentReference(params)).toBe('pz_from_url');
  });

  it('falls back to pending payment in localStorage when Payaza omits query params', () => {
    window.localStorage.setItem(
      WALLET_PENDING_PAYMENT_KEY,
      JSON.stringify({
        reference: 'pzJ05H52E67ED',
        amountInNaira: '1000',
        createdAt: Date.now(),
        provider: 'payaza',
        checkoutStarted: false,
      }),
    );

    expect(resolveWalletPaymentReference(new URLSearchParams())).toBe('pzJ05H52E67ED');
  });

  it('returns null when URL and storage have no reference', () => {
    expect(resolveWalletPaymentReference(new URLSearchParams('returnTo=%2Fchat'))).toBeNull();
  });
});

describe('startPendingWalletPaymentPoll (Payaza desktop)', () => {
  let memory: Record<string, string>;

  beforeEach(() => {
    jest.resetModules();
    memory = {};
    mockIsAigeniusDesktopRuntime.mockReset();
    mockServerCall.mockReset();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (k: string) => (Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null),
        setItem: (k: string, v: string) => {
          memory[k] = v;
        },
        removeItem: (k: string) => {
          delete memory[k];
        },
        clear: () => {
          memory = {};
        },
      },
      configurable: true,
    });
    clearPendingPaymentStorage();
  });

  it('verifies Payaza on desktop even when checkoutStarted is false', async () => {
    mockIsAigeniusDesktopRuntime.mockReturnValue(true);
    mockServerCall.mockResolvedValue({
      dataReturned: { status: 'successful', newWalletBalance: 5000 },
    });

    window.localStorage.setItem(
      WALLET_PENDING_PAYMENT_KEY,
      JSON.stringify({
        reference: 'pz_desktop_ref',
        amountInNaira: '1000',
        createdAt: Date.now(),
        provider: 'payaza',
        checkoutStarted: false,
      }),
    );

    const { startPendingWalletPaymentPoll } = await import('@/lib/wallet-pending-payment-poll');
    startPendingWalletPaymentPoll('pz_desktop_ref', '1000');

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(mockServerCall).toHaveBeenCalled();
  });

  it('does not verify Payaza on web until checkoutStarted is true', async () => {
    mockIsAigeniusDesktopRuntime.mockReturnValue(false);

    window.localStorage.setItem(
      WALLET_PENDING_PAYMENT_KEY,
      JSON.stringify({
        reference: 'pz_web_ref',
        amountInNaira: '1000',
        createdAt: Date.now(),
        provider: 'payaza',
        checkoutStarted: false,
      }),
    );

    const { startPendingWalletPaymentPoll } = await import('@/lib/wallet-pending-payment-poll');
    startPendingWalletPaymentPoll('pz_web_ref', '1000');

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(mockServerCall).not.toHaveBeenCalled();
  });
});

describe('appendWalletPaymentReferenceToCallbackUrl', () => {
  it('adds reference to an existing callback URL', () => {
    const url = appendWalletPaymentReferenceToCallbackUrl(
      'https://app.example.com/payment-callback?returnTo=%2Fchat&desktop=1',
      'pzJ05H52E67ED',
    );

    expect(url).toContain('reference=pzJ05H52E67ED');
    expect(url).toContain('desktop=1');
  });
});
