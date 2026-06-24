import { formatJsonForDisplay } from '@/app/components/JsonSyntaxBlock';

export type ParsedShellToolInner = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

/**
 * Unwraps tool `result` when the backend returns `{ result: "<json string>" }`
 * with inner `{ stdout, stderr, exit_code }` (desktop local_shell).
 */
export function parseLocalShellToolResult(parsed: Record<string, unknown> | null): ParsedShellToolInner | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const wrapped = parsed.result;
  if (typeof wrapped !== 'string' || !wrapped.trim()) return null;
  try {
    const inner = JSON.parse(wrapped) as Record<string, unknown>;
    if (inner == null || typeof inner !== 'object') return null;
    const stdout = typeof inner.stdout === 'string' ? inner.stdout : '';
    const stderr = typeof inner.stderr === 'string' ? inner.stderr : '';
    const exitCode =
      typeof inner.exit_code === 'number'
        ? inner.exit_code
        : typeof inner.exitCode === 'number'
          ? inner.exitCode
          : null;
    return { stdout, stderr, exitCode };
  } catch {
    return null;
  }
}

/** Break shell one-liners at logical operators for readable terminal display. */
export function formatCommandForTerminalDisplay(command: string): string {
  const t = command.trim();
  if (!t) return '';
  return t
    .replace(/\s*&&\s*/g, ' \\\n&& ')
    .replace(/\s*\|\|\s*/g, ' \\\n|| ')
    .replace(/\s*;\s*/g, ';\n');
}

export function prettifyResultBlockForTerminal(parsed: Record<string, unknown> | null): string {
  if (!parsed || typeof parsed !== 'object') return '';
  const inner = parseLocalShellToolResult(parsed);
  if (inner) {
    const payload = {
      exit_code: inner.exitCode,
      stdout: inner.stdout,
      stderr: inner.stderr,
    };
    return formatJsonForDisplay(payload);
  }
  return formatJsonForDisplay(parsed);
}
