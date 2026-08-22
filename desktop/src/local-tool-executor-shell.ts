import type { WebContents } from 'electron';
import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { loopbackHttpOrigin } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';
import { resolveShellProcessClose } from './utils/shell-process-close';
import { formatShellResult } from './utils/tool-formatter';
import { showShellApprovalDialog } from './shell-approval-dialog';
import { shouldRequireToolApproval } from './tool-permission-preferences';
import { sidecarFetch } from './sidecar-fetch';
import {
  buildShellApprovalFallbackDetail,
  sidecarAuthHeaders,
} from './local-tool-executor-helpers';
import { executeSidecarTool, sidecarToolsEnabled } from './sidecar-tools';

const MAX_CMD_LEN = 64_000;
const MAX_SHELL_OUT = 512 * 1024;
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

export async function connectLocalOllamaRelay(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const token = typeof args.token === 'string' ? args.token : '';
  if (!token) {
    return { ok: false, error: 'Missing token' };
  }

  try {
    const res = await sidecarFetch(`${SERVER_URL}/ollama/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      return { ok: false, error: data?.error || `Sidecar returned ${res.status}` };
    }
    return { ok: true, result: 'Ollama relay connection requested', rawData: data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Ollama relay connection failed',
    };
  }
}

export function shellChunkChannel(streamId: string): string {
  return `local-desktop-tool-chunk:${streamId}`;
}

export async function confirmLocalShellExecution(
  parent: BrowserWindow | undefined,
  command: string,
  cwdRaw: string,
  timeoutMs: number,
): Promise<boolean> {
  if (!shouldRequireToolApproval('local_shell')) {
    return true;
  }

  const detailSuffix = buildShellApprovalFallbackDetail(command);

  if (parent) {
    try {
      return await showShellApprovalDialog(parent, command, cwdRaw, timeoutMs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const { response } = await dialog.showMessageBox(parent, {
        type: 'question',
        buttons: ['Cancel', 'Run command'],
        defaultId: 1,
        cancelId: 0,
        title: 'Local terminal',
        message: 'Allow this command to run on your computer?',
        detail:
          `Custom approval UI failed (${msg}).\nUse this dialog only if you understand the risk.\n\n` +
          detailSuffix,
      });
      return response === 1;
    }
  }

  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Cancel', 'Run command'],
    defaultId: 1,
    cancelId: 0,
    title: 'Local terminal',
    message: 'Allow this command to run on your computer?',
    detail:
      'No in-app window was found (system dialog).\nOnly proceed if you trust this command.\n\n' +
      detailSuffix,
  });
  return response === 1;
}

export async function runShell(
  sender: WebContents,
  parent: BrowserWindow | undefined,
  args: Record<string, unknown>,
  streamId?: string,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const commandInput = typeof args.command === 'string' ? args.command : '';
  if (!commandInput.trim()) {
    return { ok: false, error: 'Missing command' };
  }
  const command = commandInput.replace(/\r\n?/g, '\n');
  if (command.length > MAX_CMD_LEN) {
    return { ok: false, error: `Command too long (max ${MAX_CMD_LEN} characters)` };
  }

  const cwdRaw = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : os.homedir();
  const cwdResolved = path.resolve(cwdRaw);
  try {
    const st = await fs.stat(cwdResolved);
    if (!st.isDirectory()) {
      return { ok: false, error: 'cwd must be an existing directory' };
    }
  } catch {
    return { ok: false, error: 'cwd does not exist or is not accessible' };
  }

  const timeoutMs = typeof args.timeout_ms === 'number' && args.timeout_ms >= 1000
    ? Math.min(args.timeout_ms, 300_000)
    : 60_000;

  const approved = await confirmLocalShellExecution(parent, command, cwdResolved, timeoutMs);
  if (!approved) {
    return { ok: false, error: 'User declined to run the command' };
  }

  // Streaming shell output must stay in the main process (IPC chunks). Non-streaming runs in sidecar.
  if (sidecarToolsEnabled() && !streamId) {
    const sidecar = await executeSidecarTool('local_shell', {
      command,
      cwd: cwdResolved,
      timeout_ms: timeoutMs,
    });
    if (sidecar) {
      return sidecar;
    }
  }

  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];
  const channel = streamId && streamId.length > 0 ? shellChunkChannel(streamId) : undefined;

  const sendChunk = (stream: 'stdout' | 'stderr', text: string): void => {
    if (!channel || text.length === 0) {
      return;
    }
    try {
      if (!sender.isDestroyed()) {
        sender.send(channel, { stream, text });
      }
    } catch {
      /* sender may be gone */
    }
  };

  return new Promise((resolve) => {
    const child = spawn(shell, shellArgs, {
      cwd: cwdResolved,
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
    let killedForLimit = false;

    const settle = (out: { ok: true; result: string; rawData?: any } | { ok: false; error: string }): void => {
      if (settled) {
        return;
      }
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
      if (!text) {
        return;
      }
      if (kind === 'stdout') {
        accOut += text;
      } else {
        accErr += text;
      }
      const totalBytes = Buffer.byteLength(accOut, 'utf8') + Buffer.byteLength(accErr, 'utf8');
      if (totalBytes > MAX_SHELL_OUT) {
        killedForLimit = true;
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
        return;
      }
      sendChunk(kind, text);
    };

    child.stdout?.on('data', (buf: Buffer) => onChunk('stdout', buf));
    child.stderr?.on('data', (buf: Buffer) => onChunk('stderr', buf));

    child.on('error', (err) => {
      settle({ ok: false, error: err.message });
    });

    child.on('close', (code, signal) => {
      if (settled) {
        return;
      }

      const tailOut = decOut.end();
      const tailErr = decErr.end();
      if (tailOut) {
        accOut += tailOut;
        sendChunk('stdout', tailOut);
      }
      if (tailErr) {
        accErr += tailErr;
        sendChunk('stderr', tailErr);
      }

      if (timedOut) {
        settle({ ok: false, error: 'Command timed out' });
        return;
      }

      if (killedForLimit) {
        const formatted = formatShellResult({
          stdout: accOut,
          stderr: `${accErr}\n[Output truncated: exceeded ${MAX_SHELL_OUT} bytes]`,
          exit_code: 1,
        });
        settle({
          ok: true,
          result: formatted.result,
          rawData: formatted.rawData,
        });
        return;
      }

      const { exitCode, stderrSuffix } = resolveShellProcessClose(code, signal);
      const stderrCombined = accErr + stderrSuffix;
      const formatted = formatShellResult({
        stdout: accOut,
        stderr: stderrCombined,
        exit_code: exitCode,
      });
      settle({
        ok: true,
        result: formatted.result,
        rawData: formatted.rawData,
      });
    });
  });
}