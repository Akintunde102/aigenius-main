/**
 * @jest-environment jsdom
 */

import {
  clearWalletTopUpReturnState,
  readWalletTopUpReturnState,
  saveWalletTopUpReturnState,
  WALLET_TOP_UP_RETURN_KEY,
} from '@/lib/wallet-payment-return';

describe('wallet-payment-return return state', () => {
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
      configurable: true,
    });
  });

  it('round-trips wallet top-up return state', () => {
    saveWalletTopUpReturnState({
      returnTo: '/chat',
      amountInNaira: '500',
      startedAt: Date.now(),
      reopenTarget: 'inline',
    });

    const saved = readWalletTopUpReturnState();
    expect(saved?.returnTo).toBe('/chat');
    expect(saved?.amountInNaira).toBe('500');

    clearWalletTopUpReturnState();
    expect(readWalletTopUpReturnState()).toBeNull();
    expect(window.sessionStorage.getItem(WALLET_TOP_UP_RETURN_KEY)).toBeNull();
  });
});
