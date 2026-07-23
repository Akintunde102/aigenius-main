import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import { resolveShellProcessClose } from './shell-process-close';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_SHELL_OUT = 512 * 1024;

export type ReadonlyShellResult =
  | { ok: true; stdout: string; stderr: string; exitCode: number }
  | { ok: false; error: string };

export type ReadonlyShellOptions = {
  shell: string;
  shellArgs: string[];
  cwd?: string;
  timeoutMs?: number;
};

/**
 * Run a read-only shell invocation without user approval (used by local_list_directory).
 */
export function runReadonlyShell(options: ReadonlyShellOptions): Promise<ReadonlyShellResult> {
  const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs >= 1000
    ? Math.min(options.timeoutMs, 120_000)
    : DEFAULT_TIMEOUT_MS;

  return new Promise((resolve) => {
    const child = spawn(options.shell, options.shellArgs, {
      cwd: options.cwd,
      windowsHide: true,
      env: process.env as NodeJS.ProcessEnv,
      windowsVerbatimArguments: process.platform === 'win32',
    });

    const decOut = new StringDecoder('utf8');
    const decErr = new StringDecoder('utf8');
    let accOut = '';
    let accErr = '';
    let settled = false;
    let timedOut = false;

    const settle = (out: ReadonlyShellResult): void => {
      if (settled) return;
      settled = true;
      try {
        clearTimeout(timer);
      } catch {
        /* ignore */
      }
      resolve(out);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    const onChunk = (kind: 'stdout' | 'stderr', buf: Buffer): void => {
      const dec = kind === 'stdout' ? decOut : decErr;
      const text = dec.write(buf);
      if (!text) return;
      if (kind === 'stdout') {
        accOut += text;
      } else {
        accErr += text;
      }
      const totalBytes = Buffer.byteLength(accOut, 'utf8') + Buffer.byteLength(accErr, 'utf8');
      if (totalBytes > MAX_SHELL_OUT) {
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
      }
    };

    child.stdout?.on('data', (buf: Buffer) => onChunk('stdout', buf));
    child.stderr?.on('data', (buf: Buffer) => onChunk('stderr', buf));

    child.on('error', (err) => {
      settle({ ok: false, error: err.message });
    });

    child.on('close', (code, signal) => {
      if (settled) return;

      const tailOut = decOut.end();
      const tailErr = decErr.end();
      if (tailOut) accOut += tailOut;
      if (tailErr) accErr += tailErr;

      if (timedOut) {
        settle({ ok: false, error: 'Command timed out' });
        return;
      }

      const { exitCode } = resolveShellProcessClose(code, signal);
      if (exitCode !== 0) {
        const detail = accErr.trim() || accOut.trim() || `exit code ${exitCode}`;
        settle({ ok: false, error: detail });
        return;
      }

      settle({
        ok: true,
        stdout: accOut,
        stderr: accErr,
        exitCode,
      });
    });
  });
}
