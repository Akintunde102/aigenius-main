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
import { blockInteractiveShellCommand } from './shell-interactive-block';
import { hiddenSpawnOptions } from './utils/hidden-child-process';
import { buildShellInvocation } from './utils/resolve-windows-executable';
import { killChildProcessTree } from './utils/shell-process-tree';
import {
  effectiveBlockWaitMs,
  resolveShellRunPolicy,
  SHELL_KILL_GRACE_MS,
  sidecarShellFetchTimeoutMs,
} from './utils/shell-run-policy.utils';
import { processRegistry } from './process-registry';

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
  const action = typeof args.action === 'string' ? args.action.trim().toLowerCase() : 'run';

  if (action === 'list') {
    const list = processRegistry.list();
    if (list.length === 0) {
      return { ok: true, result: '### Background Processes\n\nNo background processes are currently tracked.' };
    }
    const table = list
      .map(
        (p) =>
          `- **PID ${p.pid}** (${p.status}) — \`${p.command}\` in \`${p.cwd}\` (uptime: ${p.uptime_seconds}s${p.exit_code != null ? `, exit: ${p.exit_code}` : ''})`,
      )
      .join('\n');
    return { ok: true, result: `### Background Processes (${list.length})\n\n${table}`, rawData: list };
  }

function parseProcessPid(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const direct = parseInt(trimmed, 10);
    if (!Number.isNaN(direct) && direct > 0) {
      return direct;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits) {
      const parsed = parseInt(digits, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }
  return null;
}

  if (action === 'status') {
    const pid = parseProcessPid(args.pid ?? args.taskId);
    if (!pid) {
      return { ok: false, error: 'pid or taskId is required for status action' };
    }
    const proc = processRegistry.get(pid);
    if (!proc) {
      return { ok: false, error: `Process with PID ${pid} not found in registry.` };
    }
    const uptime = Math.round(((proc.endedAt ?? Date.now()) - proc.startedAt) / 1000);
    const md =
      `### Process Status (PID ${pid})\n\n` +
      `- **Status**: ${proc.status}\n` +
      `- **Command**: \`${proc.command}\`\n` +
      `- **CWD**: \`${proc.cwd}\`\n` +
      `- **Uptime**: ${uptime}s\n` +
      `- **Exit code**: ${proc.exitCode ?? 'running'}\n`;
    return { ok: true, result: md, rawData: proc };
  }

  if (action === 'logs') {
    const pid = parseProcessPid(args.pid ?? args.taskId);
    if (!pid) {
      return { ok: false, error: 'pid or taskId is required for logs action' };
    }
    const lines =
      typeof args.tail_lines === 'number'
        ? args.tail_lines
        : typeof args.lines === 'number'
          ? args.lines
          : 50;
    const logs = processRegistry.getLogs(pid, lines);
    if (!logs.ok) {
      return logs;
    }
    let md = `### Process Logs (PID ${pid} — ${logs.status})\n\n`;
    if (logs.stdout.trim()) {
      md += `**Stdout**\n\n\`\`\`\n${logs.stdout.trim()}\n\`\`\`\n\n`;
    }
    if (logs.stderr.trim()) {
      md += `**Stderr**\n\n\`\`\`\n${logs.stderr.trim()}\n\`\`\`\n\n`;
    }
    if (!logs.stdout.trim() && !logs.stderr.trim()) {
      md += '*No output recorded yet for this process.*\n';
    }
    return { ok: true, result: md.trimEnd() + '\n', rawData: logs };
  }

  if (action === 'kill') {
    const pid = parseProcessPid(args.pid ?? args.taskId);
    if (!pid) {
      return { ok: false, error: 'pid or taskId is required for kill action' };
    }
    const res = processRegistry.kill(pid);
    if (!res.ok) {
      return res;
    }
    return { ok: true, result: `### Process Terminated\n\n${res.message}`, rawData: res };
  }

  const commandInput = typeof args.command === 'string' ? args.command : '';
  if (!commandInput.trim()) {
    return { ok: false, error: 'Missing command' };
  }
  const command = commandInput.replace(/\r\n?/g, '\n');
  if (command.length > MAX_CMD_LEN) {
    return { ok: false, error: `Command too long (max ${MAX_CMD_LEN} characters)` };
  }

  const interactiveBlock = blockInteractiveShellCommand(command);
  if (interactiveBlock) {
    return { ok: false, error: interactiveBlock };
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

  const policy = resolveShellRunPolicy(command, args);
  const timeoutMs = policy.timeoutMs;

  const approved = await confirmLocalShellExecution(parent, command, cwdResolved, timeoutMs);
  if (!approved) {
    return { ok: false, error: 'User declined to run the command' };
  }

  // Streaming shell output must stay in the main process (IPC chunks). Non-streaming runs in sidecar.
  if (sidecarToolsEnabled() && !streamId) {
    const sidecar = await executeSidecarTool(
      'local_shell',
      {
        command,
        cwd: cwdResolved,
        timeout_ms: timeoutMs,
        ...(policy.blockUntilMs != null ? { block_until_ms: policy.blockUntilMs } : {}),
      },
      sidecarShellFetchTimeoutMs(policy),
    );
    if (sidecar) {
      return sidecar;
    }
  }

  const { shell, args: shellArgs, windowsVerbatimArguments } = buildShellInvocation(command);
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
    const child = spawn(
      shell,
      shellArgs,
      hiddenSpawnOptions({
        cwd: cwdResolved,
        env: process.env as NodeJS.ProcessEnv,
        windowsVerbatimArguments,
        // Ignore stdin so CLIs cannot hang waiting for input that never arrives.
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    );

    const decOut = new StringDecoder('utf8');
    const decErr = new StringDecoder('utf8');
    let accOut = '';
    let accErr = '';
    let settled = false;
    let timedOut = false;
    let killedForLimit = false;
    let backgrounded = false;
    let killGrace: ReturnType<typeof setTimeout> | undefined;
    let blockTimer: ReturnType<typeof setTimeout> | undefined;
    let killTimer: ReturnType<typeof setTimeout> | undefined;

    const settle = (out: { ok: true; result: string; rawData?: any } | { ok: false; error: string }): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (killTimer) {
        clearTimeout(killTimer);
      }
      if (blockTimer) {
        clearTimeout(blockTimer);
      }
      if (killGrace) {
        clearTimeout(killGrace);
      }
      resolve(out);
    };

    const flushTails = (): void => {
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
    };

    const timeoutError = (): { ok: false; error: string } => {
      const parts = [`Command timed out after ${Math.round(timeoutMs / 1000)}s and was stopped.`];
      if (accOut.trim()) {
        parts.push(`stdout:\n${accOut.trim()}`);
      }
      if (accErr.trim()) {
        parts.push(`stderr:\n${accErr.trim()}`);
      }
      return { ok: false, error: parts.join('\n\n') };
    };

    const backgroundResult = (): { ok: true; result: string; rawData?: any } => {
      const formatted = formatShellResult({
        stdout: accOut,
        stderr: accErr,
        exit_code: null,
        backgrounded: true,
        pid: child.pid,
      });
      return { ok: true, result: formatted.result, rawData: formatted.rawData };
    };

    const requestKill = (): void => {
      timedOut = true;
      killChildProcessTree(child);
      killGrace = setTimeout(() => {
        if (settled) {
          return;
        }
        flushTails();
        try {
          child.unref();
        } catch {
          /* ignore */
        }
        settle(timeoutError());
      }, SHELL_KILL_GRACE_MS);
    };

    if (policy.blockUntilMs != null) {
      blockTimer = setTimeout(() => {
        if (settled) {
          return;
        }
        backgrounded = true;
        flushTails();
        try {
          processRegistry.register(child, command, cwdResolved, accOut, accErr);
        } catch {
          /* ignore */
        }
        try {
          child.unref();
        } catch {
          /* ignore */
        }
        settle(backgroundResult());
      }, effectiveBlockWaitMs(policy.blockUntilMs));
    } else {
      killTimer = setTimeout(requestKill, timeoutMs);
    }

    const onChunk = (kind: 'stdout' | 'stderr', buf: Buffer): void => {
      if (settled) {
        return;
      }
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
        killChildProcessTree(child);
        return;
      }
      sendChunk(kind, text);
    };

    child.stdout?.on('data', (buf: Buffer) => onChunk('stdout', buf));
    child.stderr?.on('data', (buf: Buffer) => onChunk('stderr', buf));

    child.on('error', (err) => {
      settle({ ok: false, error: err.message });
    });

    const onEnded = (code: number | null, signal: NodeJS.Signals | null): void => {
      if (settled || backgrounded) {
        return;
      }

      flushTails();

      if (timedOut) {
        settle(timeoutError());
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
    };

    child.on('exit', onEnded);
    child.on('close', onEnded);
  });
}