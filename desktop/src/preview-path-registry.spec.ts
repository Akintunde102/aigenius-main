import {
  clearPreviewPathRegistryForTests,
  isPreviewPathRegistered,
  registerPreviewPath,
} from './preview-path-registry';

const TTL_MS = 30 * 60 * 1000;
const PRUNE_EVERY_N_REGISTRATIONS = 32;

describe('preview-path-registry', () => {
  beforeEach(() => {
    clearPreviewPathRegistryForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores relative paths', () => {
    registerPreviewPath('relative/file.txt');
    expect(isPreviewPathRegistered('relative/file.txt')).toBe(false);
  });

  it('prunes expired entries during registration sweeps', () => {
    registerPreviewPath('/abs/stale.txt');
    jest.advanceTimersByTime(TTL_MS + 1);

    for (let i = 0; i < PRUNE_EVERY_N_REGISTRATIONS; i += 1) {
      registerPreviewPath(`/abs/active-${i}.txt`);
    }

    expect(isPreviewPathRegistered('/abs/stale.txt')).toBe(false);
    expect(isPreviewPathRegistered('/abs/active-0.txt')).toBe(true);
  });

  it('keeps active entries when pruning runs', () => {
    registerPreviewPath('/abs/keep-me.txt');

    for (let i = 0; i < PRUNE_EVERY_N_REGISTRATIONS; i += 1) {
      registerPreviewPath(`/abs/other-${i}.txt`);
    }

    expect(isPreviewPathRegistered('/abs/keep-me.txt')).toBe(true);
  });

  it('still removes expired entries on lookup before the next sweep', () => {
    registerPreviewPath('/abs/lazy-stale.txt');
    jest.advanceTimersByTime(TTL_MS + 1);

    expect(isPreviewPathRegistered('/abs/lazy-stale.txt')).toBe(false);
  });
});
