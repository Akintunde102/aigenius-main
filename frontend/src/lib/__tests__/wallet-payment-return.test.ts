/**
 * @jest-environment jsdom
 */

import {
  clearWalletTopUpPendingState,
  readWalletTopUpPendingState,
  saveWalletTopUpPendingState,
  WALLET_TOP_UP_PENDING_KEY,
} from '@/lib/wallet-payment-return';

describe('wallet-payment-return pending state', () => {
  let memory: Record<string, string>;

  beforeEach(() => {
    memory = {};
    Object.defineProperty(window, 'sessionStorage', {
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
      writable: true,
      configurable: true,
    });
  });

  it('saves and reads pending desktop top-up state', () => {
    saveWalletTopUpPendingState({
      reference: 'ref_123',
      amountInNaira: '1000',
      startedAt: 1,
      reopenTarget: 'inline',
    });

    expect(readWalletTopUpPendingState()).toEqual({
      reference: 'ref_123',
      amountInNaira: '1000',
      startedAt: 1,
      reopenTarget: 'inline',
    });
  });

  it('clears pending desktop top-up state', () => {
    saveWalletTopUpPendingState({
      reference: 'ref_123',
      amountInNaira: '1000',
      startedAt: 1,
      reopenTarget: 'sidebar',
    });

    clearWalletTopUpPendingState();

    expect(sessionStorage.getItem(WALLET_TOP_UP_PENDING_KEY)).toBeNull();
    expect(readWalletTopUpPendingState()).toBeNull();
  });
});
