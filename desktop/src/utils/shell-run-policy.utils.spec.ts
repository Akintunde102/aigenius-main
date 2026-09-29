import {
  DEFAULT_LONG_RUNNING_BLOCK_MS,
  DEFAULT_SHELL_TIMEOUT_MS,
  effectiveBlockWaitMs,
  isLongRunningShellCommand,
  resolveShellRunPolicy,
  resolveShellTimeoutMs,
  sidecarShellFetchTimeoutMs,
} from './shell-run-policy.utils';

describe('isLongRunningShellCommand', () => {
  it('detects common JS dev-server commands', () => {
    expect(isLongRunningShellCommand('npm run dev')).toBe(true);
    expect(isLongRunningShellCommand('npm run dev:frontend')).toBe(true);
    expect(isLongRunningShellCommand('pnpm start')).toBe(true);
    expect(isLongRunningShellCommand('yarn dev')).toBe(true);
    expect(isLongRunningShellCommand('npx next dev')).toBe(true);
    expect(isLongRunningShellCommand('vite')).toBe(true);
    expect(isLongRunningShellCommand('npx vite')).toBe(true);
    expect(isLongRunningShellCommand('npx vite --port 3000')).toBe(true);
    expect(isLongRunningShellCommand('vite build')).toBe(false);
  });

  it('detects next/vite/watch-style servers', () => {
    expect(isLongRunningShellCommand('next dev')).toBe(true);
    expect(isLongRunningShellCommand('vite dev')).toBe(true);
    expect(isLongRunningShellCommand('nodemon src/index.js')).toBe(true);
    expect(isLongRunningShellCommand('tsx watch src/main.ts')).toBe(true);
    expect(isLongRunningShellCommand('nest start --watch')).toBe(true);
  });

  it('does not treat one-shot builds and tests as long-running', () => {
    expect(isLongRunningShellCommand('npm test')).toBe(false);
    expect(isLongRunningShellCommand('npm run build')).toBe(false);
    expect(isLongRunningShellCommand('echo hello')).toBe(false);
    expect(isLongRunningShellCommand('pytest')).toBe(false);
    expect(isLongRunningShellCommand('npm run develop-docs')).toBe(false);
  });
});

describe('resolveShellRunPolicy', () => {
  it('uses the default kill timeout and does not background one-shot commands', () => {
    expect(resolveShellRunPolicy('npm test', {})).toEqual({
      timeoutMs: DEFAULT_SHELL_TIMEOUT_MS,
      blockUntilMs: null,
    });
  });

  it('auto-backgrounds npm run dev after the startup window', () => {
    const policy = resolveShellRunPolicy('npm run dev', {});
    expect(policy.timeoutMs).toBe(DEFAULT_SHELL_TIMEOUT_MS);
    expect(policy.blockUntilMs).toBe(DEFAULT_LONG_RUNNING_BLOCK_MS);
  });

  it('honors explicit block_until_ms including zero', () => {
    expect(resolveShellRunPolicy('sleep 10', { block_until_ms: 0 }).blockUntilMs).toBe(0);
    expect(resolveShellRunPolicy('sleep 10', { block_until_ms: 5_000 }).blockUntilMs).toBe(5_000);
  });

  it('caps block_until_ms at timeout_ms', () => {
    expect(
      resolveShellRunPolicy('npm run dev', { timeout_ms: 3_000, block_until_ms: 30_000 }).blockUntilMs,
    ).toBe(3_000);
  });

  it('clamps timeout_ms', () => {
    expect(resolveShellTimeoutMs(500)).toBe(DEFAULT_SHELL_TIMEOUT_MS);
    expect(resolveShellTimeoutMs(999_999)).toBe(300_000);
    expect(resolveShellTimeoutMs(12_000)).toBe(12_000);
  });
});

describe('sidecarShellFetchTimeoutMs', () => {
  it('waits past the kill grace so HTTP does not abort a still-running shell', () => {
    const policy = resolveShellRunPolicy('echo hi', { timeout_ms: 10_000 });
    expect(sidecarShellFetchTimeoutMs(policy)).toBeGreaterThan(10_000);
  });

  it('uses the background wait for long-running commands instead of the 60s kill cap', () => {
    const policy = resolveShellRunPolicy('npm run dev', {});
    const ms = sidecarShellFetchTimeoutMs(policy);
    expect(ms).toBeGreaterThan(effectiveBlockWaitMs(DEFAULT_LONG_RUNNING_BLOCK_MS));
    expect(ms).toBeLessThan(DEFAULT_SHELL_TIMEOUT_MS);
  });
});
