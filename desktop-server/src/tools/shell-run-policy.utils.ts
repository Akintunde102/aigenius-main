export const DEFAULT_SHELL_TIMEOUT_MS = 60_000;
export const MAX_SHELL_TIMEOUT_MS = 300_000;
export const DEFAULT_LONG_RUNNING_BLOCK_MS = 20_000;
export const MIN_BACKGROUND_WAIT_MS = 50;
export const SHELL_KILL_GRACE_MS = 2_000;

/**
 * Commands that normally never exit (dev servers, watchers). Waiting for `close`
 * hangs the tool call; these should be backgrounded after a short startup window.
 */
const LONG_RUNNING_PATTERNS: RegExp[] = [
  /\b(npm|pnpm|yarn|bun)(?:\.cmd)?\s+(run\s+)?(dev|start|serve)(:\S*)?\b/i,
  /\b(next|nuxt|astro|remix)\s+dev\b/i,
  /\bvite\b(?!\s+build\b)/i,
  /\b(webpack-dev-server|webpack\s+serve)\b/i,
  /\b(nodemon|tsx\s+watch|ts-node-dev|node\s+--watch)\b/i,
  /\b(python(?:3)?\s+-m\s+http\.server|flask\s+run|uvicorn)\b/i,
  /\bdocker\s+compose\s+up\b/i,
  /\bnest\s+start(?:\s+.*)?--watch\b/i,
];

export function isLongRunningShellCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) {
    return false;
  }
  return LONG_RUNNING_PATTERNS.some((re) => re.test(trimmed));
}

export function resolveShellTimeoutMs(timeoutMs: unknown): number {
  if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs >= 1000) {
    return Math.min(Math.floor(timeoutMs), MAX_SHELL_TIMEOUT_MS);
  }
  return DEFAULT_SHELL_TIMEOUT_MS;
}

export type ShellRunPolicy = {
  timeoutMs: number;
  /** Wait this long then return while the process is still running. Null = wait for exit or kill timeout. */
  blockUntilMs: number | null;
};

export function resolveShellRunPolicy(
  command: string,
  args: { timeout_ms?: unknown; block_until_ms?: unknown },
): ShellRunPolicy {
  const timeoutMs = resolveShellTimeoutMs(args.timeout_ms);

  if (typeof args.block_until_ms === 'number' && Number.isFinite(args.block_until_ms)) {
    const block = Math.max(0, Math.floor(args.block_until_ms));
    return { timeoutMs, blockUntilMs: Math.min(block, timeoutMs) };
  }

  if (isLongRunningShellCommand(command)) {
    return { timeoutMs, blockUntilMs: Math.min(DEFAULT_LONG_RUNNING_BLOCK_MS, timeoutMs) };
  }

  return { timeoutMs, blockUntilMs: null };
}

export function effectiveBlockWaitMs(blockUntilMs: number): number {
  return Math.max(blockUntilMs, MIN_BACKGROUND_WAIT_MS);
}
