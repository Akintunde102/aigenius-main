import { dialog, shell } from 'electron';
import type { BrowserWindow, WebContents } from 'electron';
import { applyLocalPatch } from './local-apply-patch';
import { showShellApprovalDialog } from './shell-approval-dialog';
import { resolveBrowserWindowForIpcSender } from './resolve-browser-window-for-ipc';
import { getRetrievalMemoryBySlugFromTool, upsertRetrievalMemoryFromTool } from './local-retrieval-memory';
import { spawn } from 'child_process';
import { StringDecoder } from 'string_decoder';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  formatDirectoryListing,
  formatApplyPatchResult,
  formatIndexRescan,
  formatIndexStatus,
  formatRagResults,
  formatReadFile,
  formatShellResult,
} from './utils/tool-formatter';
import { isIgnored } from './utils/exemptions';
import { registerPreviewPaths } from './preview-path-registry';

function registerTrustedToolPaths(...paths: Array<string | undefined>): void {
  registerPreviewPaths(paths.filter((p): p is string => typeof p === 'string' && path.isAbsolute(p)));
}

const MAX_CMD_LEN = 64_000;
const MAX_SHELL_OUT = 512 * 1024;
const SHELL_APPROVAL_FALLBACK_PREVIEW_MAX = 2000;

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

function buildShellApprovalFallbackDetail(command: string): string {
  const truncated = command.length > SHELL_APPROVAL_FALLBACK_PREVIEW_MAX;
  const preview =
    command.slice(0, SHELL_APPROVAL_FALLBACK_PREVIEW_MAX) +
    (truncated ? '\n… (truncated)' : '');
  const needsWarning =
    truncated || /[\n\u2028\u2029]/.test(command);
  const warning = needsWarning
    ? '\n\nNote: This preview may not show the full command. Approve only if you reviewed the entire command (including every line).'
    : '';
  return preview + warning;
}

const MINI_SERVER_PORT = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
const SERVER_URL = `http://127.0.0.1:${MINI_SERVER_PORT}`;

/** Builds the Authorization header for requests to the local sidecar. Fail-closed: throws if the token was never injected. */
function sidecarAuthHeaders(): Record<string, string> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  if (!token) throw new Error('AIGENIUS_SECRET_TOKEN is not set');
  return { Authorization: `Bearer ${token}` };
}


export async function runLocalDesktopTool(
  sender: WebContents,
  tool: string,
  rawArgs: Record<string, unknown>,
  shellStreamId?: string,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const win = resolveBrowserWindowForIpcSender(sender);

  switch (tool) {
    case 'run_command':
    case 'local_shell':
      return runShell(sender, win, rawArgs, shellStreamId);
    case 'local_read_file':
      return readBoundedFile(rawArgs);
    case 'local_rag_query': {
      try {
        const contentQuery = typeof rawArgs.content_query === 'string' ? rawArgs.content_query : '';
        const pathQuery = typeof rawArgs.path_query === 'string' ? rawArgs.path_query : '';
        const topK = typeof rawArgs.top_k === 'number' ? rawArgs.top_k : 8;
        const prefix =
          typeof rawArgs.path_prefix === 'string' ? rawArgs.path_prefix : '';

        const extensions = Array.isArray(rawArgs.extensions) ? rawArgs.extensions : undefined;
        const res = await fetch(`${SERVER_URL}/search/rag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({ contentQuery, pathQuery, topK, pathPrefix: prefix, extensions }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[aigenius-desktop][mini-server] /search/rag error:', res.status, body);
          throw new Error(`Sidecar returned ${res.status}: ${body}`);
        }
        const data = await res.json();
        const hits = Array.isArray(data?.hits) ? data.hits : [];
        const pathsToRegister: string[] = [];
        for (const hit of hits) {
          const hitPath = typeof hit?.path === 'string' ? hit.path : undefined;
          if (!hitPath) continue;
          pathsToRegister.push(hitPath);
          const parent = path.dirname(hitPath);
          if (parent && parent !== hitPath && path.isAbsolute(parent)) {
            pathsToRegister.push(parent);
          }
        }
        registerTrustedToolPaths(...pathsToRegister);
        const formatted = formatRagResults(data);
        return { ok: true, result: formatted.result, rawData: formatted.rawData };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Search service unavailable',
        };
      }
    }
    case 'local_index_status': {
      try {
        const extensions = Array.isArray(rawArgs.extensions) ? rawArgs.extensions : undefined;
        const res = await fetch(`${SERVER_URL}/search/status`, {
          headers: sidecarAuthHeaders(),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[aigenius-desktop][mini-server] /search/status error:', res.status, body);
          throw new Error(`Sidecar returned ${res.status}: ${body}`);
        }
        const status = await res.json();
        const formatted = formatIndexStatus({ ...status, scan_in_progress: false });
        return {
          ok: true,
          result: formatted.result,
          rawData: formatted.rawData,
        };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Search service unavailable',
        };
      }
    }
    case 'local_index_rescan': {
      try {
        const p = typeof rawArgs.path === 'string' ? rawArgs.path : undefined;
        const extensions = Array.isArray(rawArgs.extensions) ? rawArgs.extensions : undefined;
        const res = await fetch(`${SERVER_URL}/search/reindex`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({ paths: p ? [p] : undefined }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[aigenius-desktop][mini-server] /search/reindex error:', res.status, body);
          throw new Error(`Sidecar returned ${res.status}: ${body}`);
        }
        const data = await res.json();
        const formatted = formatIndexRescan({ queued: data.queued });
        return {
          ok: true,
          result: formatted.result,
          rawData: formatted.rawData,
        };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Search module unavailable',
        };
      }
    }
    case 'local_list_directory':
      return listLocalDirectory(rawArgs);
    case 'local_retrieval_memory_get':
      try {
        return await getRetrievalMemoryBySlugFromTool(rawArgs);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Retrieval memory unavailable' };
      }
    case 'local_retrieval_memory_upsert':
      try {
        return await upsertRetrievalMemoryFromTool(rawArgs);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Retrieval memory unavailable' };
      }
    case 'local_open_in_os':
      try {
        const p = typeof rawArgs.path === 'string' ? rawArgs.path : '';
        if (!p) return { ok: false, error: 'Missing path' };
        if (!path.isAbsolute(p)) {
          return { ok: false, error: 'path must be an absolute path' };
        }
        registerTrustedToolPaths(p);
        await shell.openPath(p);
        return { ok: true, result: 'File opened in OS' };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    case 'local_apply_patch': {
      const patchResult = await applyLocalPatch(win, rawArgs);
      if (!patchResult.ok) return patchResult;
      try {
        const parsed = JSON.parse(patchResult.result) as Parameters<typeof formatApplyPatchResult>[0];
        const patchPaths = Array.isArray(parsed.results)
          ? parsed.results.map((r) => r.path)
          : [];
        registerTrustedToolPaths(...patchPaths);
        const formatted = formatApplyPatchResult(parsed);
        return { ok: true, result: formatted.result, rawData: formatted.rawData };
      } catch {
        return patchResult;
      }
    }
    case 'local_ollama_status':
      return checkLocalOllamaStatus();
    case 'local_ollama_connect':
      return connectLocalOllamaRelay(rawArgs);
    case 'local_ollama_chat':
      return runLocalOllamaChat(sender, rawArgs, shellStreamId);
    default:
      return { ok: false, error: `Unknown local tool: ${tool}` };
  }
}

async function connectLocalOllamaRelay(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const token = typeof args.token === 'string' ? args.token : '';
  if (!token) {
    return { ok: false, error: 'Missing token' };
  }

  try {
    const res = await fetch(`${SERVER_URL}/ollama/connect`, {
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

function shellChunkChannel(streamId: string): string {
  return `local-desktop-tool-chunk:${streamId}`;
}

async function confirmLocalShellExecution(
  parent: BrowserWindow | undefined,
  command: string,
  cwdRaw: string,
  timeoutMs: number,
): Promise<boolean> {
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

async function runShell(
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

async function readBoundedFile(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const p = typeof args.path === 'string' ? args.path : '';
  if (!p || !path.isAbsolute(p)) {
    return { ok: false, error: 'path must be an absolute path' };
  }
  const offset = typeof args.offset === 'number' && args.offset >= 0 ? args.offset : 0;
  const maxBytes = typeof args.max_bytes === 'number'
    ? Math.min(Math.max(1, args.max_bytes), 2_000_000)
    : 65_536;
  try {
    const fh = await fs.open(p, 'r');
    try {
      const buf = Buffer.alloc(maxBytes);
      const { bytesRead } = await fh.read(buf, 0, maxBytes, offset);
      const slice = buf.subarray(0, bytesRead);
      const text = slice.toString('utf8');
      const formatted = formatReadFile({
        path: p,
        offset,
        bytes_read: bytesRead,
        truncated: bytesRead === maxBytes,
        content: text,
      });
      registerTrustedToolPaths(p);
      return {
        ok: true,
        result: formatted.result,
        rawData: formatted.rawData,
      };
    } finally {
      await fh.close();
    }
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'read failed' };
  }
}

async function listLocalDirectory(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const dirPath = typeof args.path === 'string' ? args.path : '';
  if (!dirPath || !path.isAbsolute(dirPath)) {
    return { ok: false, error: 'path must be an absolute directory path' };
  }

  const recursive = !!args.recursive;
  const extensions = Array.isArray(args.extensions)
    ? (args.extensions as string[]).map(e => e.toLowerCase().replace(/^\./, ''))
    : null;
  const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 1000) : 100;

  try {
    const results: Array<{ path: string; name: string; isDir: boolean; size?: number; mtime?: number }> = [];

    async function walk(currentPath: string) {
      if (results.length >= limit) return;

      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (results.length >= limit) break;

        const fullPath = path.join(currentPath, entry.name);

        // Skip common noise folders if we're not explicitly in them
        if (isIgnored(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          results.push({ path: fullPath, name: entry.name, isDir: true });
          if (recursive) {
            try {
              await walk(fullPath);
            } catch {
              // Skip directories we can't access
            }
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          if (!extensions || extensions.includes(ext)) {
            let size = 0;
            let mtime = 0;
            try {
              const stat = await fs.stat(fullPath);
              size = stat.size;
              mtime = Math.floor(stat.mtimeMs);
            } catch { }

            results.push({ path: fullPath, name: entry.name, isDir: false, size, mtime });
          }
        }
      }
    }

    await walk(dirPath);

    const hitLimit = results.length >= limit;
    const formatted = formatDirectoryListing({ path: dirPath, items: results, hitLimit });
    registerTrustedToolPaths(
      dirPath,
      ...results.filter((item) => !item.isDir).map((item) => item.path),
    );
    return {
      ok: true,
      result: formatted.result,
      rawData: formatted.rawData,
    };
  } catch (e: any) {
    return { ok: false, error: `Failed to list directory: ${e.message}` };
  }
}

async function checkLocalOllamaStatus(): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/tags`);
    if (!res.ok) {
      return { ok: false, error: `Ollama returned ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, result: 'Ollama is running', rawData: data };
  } catch (e) {
    return { ok: false, error: 'Ollama is not running or not reachable' };
  }
}

import {
  formatOllamaCloudError,
  getOllamaRegistryModelName,
  isOllamaCloudModel,
  OLLAMA_LOCAL_BASE_URL,
} from './ollama-cloud.js';

async function ensureOllamaCloudModelAvailable(model: string): Promise<void> {
  if (!isOllamaCloudModel(model)) {
    return;
  }

  const registryModel = getOllamaRegistryModelName(model);
  const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: registryModel, stream: false }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const detail = body.trim() || res.statusText;
    throw new Error(`Could not prepare Ollama Cloud model "${registryModel}". Run "ollama signin" and try again. ${detail}`);
  }
}

async function readOllamaError(res: Response): Promise<string> {
  const body = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
  return body.trim() || res.statusText;
}

async function runLocalOllamaChat(
  sender: WebContents,
  args: Record<string, unknown>,
  streamId?: string,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const channel = streamId && streamId.length > 0 ? shellChunkChannel(streamId) : undefined;

  const sendChunk = (text: string): void => {
    if (!channel || text.length === 0) return;
    try {
      if (!sender.isDestroyed()) {
        sender.send(channel, { stream: 'stdout', text });
      }
    } catch {
      // sender may be gone
    }
  };

  try {
    const payload = args.payload as Record<string, unknown> | undefined;
    const model = typeof payload?.model === 'string' ? payload.model : '';
    await ensureOllamaCloudModelAvailable(model);

    const resolvedModel = isOllamaCloudModel(model) ? getOllamaRegistryModelName(model) : model;
    const chatPayload = {
      ...payload,
      model: resolvedModel,
    };

    const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chatPayload),
    });

    if (!res.ok) {
      const detail = await readOllamaError(res);
      return {
        ok: false,
        error: `Ollama API error: ${isOllamaCloudModel(model) ? formatOllamaCloudError(detail) : detail}`,
      };
    }
    if (!res.body) {
      return { ok: false, error: 'No response body from Ollama' };
    }

    let fullResponse = '';
    const reader = res.body.getReader();
    const decoder = new StringDecoder('utf8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.write(Buffer.from(value));
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last partial line in the buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            fullResponse += parsed.message.content;
          }
          sendChunk(line + '\n');
        } catch (e) {
          // invalid json chunk, ignore
        }
      }
    }

    if (buffer.trim()) {
      try {
        const parsed = JSON.parse(buffer);
        if (parsed.message?.content) {
          fullResponse += parsed.message.content;
        }
        sendChunk(buffer + '\n');
      } catch {
        // ignore
      }
    }

    return { ok: true, result: fullResponse };
  } catch (e: any) {
    return { ok: false, error: e.message || 'Failed to chat with Ollama' };
  }
}
