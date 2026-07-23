/**
 * Maps child_process `close` (code, signal) to a numeric exit code and optional stderr suffix.
 */
export function resolveShellProcessClose(
  code: number | null,
  signal: NodeJS.Signals | null,
): { exitCode: number; stderrSuffix: string } {
  if (typeof code === 'number') {
    return { exitCode: code, stderrSuffix: '' };
  }
  if (signal) {
    return {
      exitCode: 1,
      stderrSuffix: `\n[Process terminated by signal: ${signal}]`,
    };
  }
  return {
    exitCode: 1,
    stderrSuffix: '\n[Process exited with unknown status]',
  };
}
