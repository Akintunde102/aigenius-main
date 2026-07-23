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
  formatGetContext,
  formatRagResults,
  formatReadFile,
  formatReadFileBatch,
  formatShellResult,
} from './utils/tool-formatter';
import { isIgnored } from './utils/exemptions';
import { listDirectoryViaShell } from './utils/list-directory-via-shell';
import { resolveShellProcessClose } from './utils/shell-process-close';
import { loopbackHttpOrigin } from './loopback-host';
import { shouldRequireToolApproval, normalizeDesktopToolId, TOOL_PERMISSION_CATALOG } from './tool-permission-preferences';
import { getActiveCodeProjectRootPath } from './active-code-project';
import { extractSymbolOutline } from './symbol-outline';
import { runGitDiff, runGitStatus } from './local-git';
import { runFindReferences } from './local-find-references';
import { runGrep } from './local-grep';
import { runGoToDefinition } from './local-lsp';
import { executeReadFile } from './utils/read-file';
import {
  registerRagHitsForPreview,
  registerReadFileBatchForPreview,
  registerAbsolutePathForPreview,
} from './utils/register-preview-paths';
import { formatEditSessionHint, getTouchedFilesSnapshot } from './edit-session';
import { recordBlastRadiusCheck } from './patch-blast-radius-gate';
import { applyEditorDefaultsToToolArgs } from './active-editor-main';
import { sidecarFetch } from './sidecar-fetch';

const MAX_CMD_LEN = 64_000;
const MAX_SHELL_OUT = 512 * 1024;
const SHELL_APPROVAL_FALLBACK_PREVIEW_MAX = 2000;

export { resolveShellProcessClose } from './utils/shell-process-close';

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
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

/** Builds the Authorization header for requests to the local sidecar. Fail-closed: throws if the token was never injected. */
function sidecarAuthHeaders(): Record<string, string> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  if (!token) throw new Error('AIGENIUS_SECRET_TOKEN is not set');
  return { Authorization: `Bearer ${token}` };
}


function toolHasDedicatedApprovalUi(tool: string): boolean {
  const id = normalizeDesktopToolId(tool);
  return id === 'local_shell' || id === 'local_apply_patch';
}

function toolApprovalLabel(tool: string): string {
  const id = normalizeDesktopToolId(tool);
  const entry = TOOL_PERMISSION_CATALOG.find((t) => t.id === id);
  return entry?.label ?? id;
}

async function confirmGenericToolExecution(
  parent: BrowserWindow | undefined,
  tool: string,
): Promise<boolean> {
  const label = toolApprovalLabel(tool);
  const detail = `The assistant wants to run "${label}" on your computer.`;
  if (parent) {
    const { response } = await dialog.showMessageBox(parent, {
      type: 'question',
      buttons: ['Cancel', 'Allow'],
      defaultId: 1,
      cancelId: 0,
      title: 'Local tool',
      message: `Allow ${label}?`,
      detail,
    });
    return response === 1;
  }
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Cancel', 'Allow'],
    defaultId: 1,
    cancelId: 0,
    title: 'Local tool',
    message: `Allow ${label}?`,
    detail,
  });
  return response === 1;
}

export async function runLocalDesktopTool(
  sender: WebContents,
  tool: string,
  rawArgs: Record<string, unknown>,
  shellStreamId?: string,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const win = resolveBrowserWindowForIpcSender(sender);
  tool = normalizeDesktopToolId(tool);

  if (shouldRequireToolApproval(tool) && !toolHasDedicatedApprovalUi(tool)) {
    const approved = await confirmGenericToolExecution(win, tool);
    if (!approved) {
      return { ok: false, error: 'User declined to run the tool' };
    }
  }

  switch (tool) {
    case 'run_command':
    case 'local_shell':
      return runShell(sender, win, rawArgs, shellStreamId);
    case 'local_read_file':
      return readBoundedFile(rawArgs);
    case 'local_rag_query': {
      try {
        const contentQuery =
          typeof rawArgs.content_query === 'string'
            ? rawArgs.content_query
            : typeof rawArgs.query === 'string'
              ? rawArgs.query
              : '';
        const pathQuery = typeof rawArgs.path_query === 'string' ? rawArgs.path_query : '';
        const topK = typeof rawArgs.top_k === 'number' ? rawArgs.top_k : 8;
        const prefix =
          typeof rawArgs.path_prefix === 'string' && rawArgs.path_prefix.trim()
            ? rawArgs.path_prefix.trim()
            : (getActiveCodeProjectRootPath() ?? '');

        const extensions = Array.isArray(rawArgs.extensions) ? rawArgs.extensions : undefined;
        const res = await sidecarFetch(`${SERVER_URL}/search/rag`, {
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
        registerRagHitsForPreview(data.hits);
        const formatted = formatRagResults(data);
        return { ok: true, result: formatted.result, rawData: formatted.rawData };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : 'Search service unavailable',
        };
      }
    }
    case 'local_list_directory':
      return listLocalDirectory(rawArgs);
    case 'local_symbol_outline': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { path: true });
        const p = typeof args.path === 'string' ? args.path : '';
        if (!p) return { ok: false, error: 'Missing path' };
        const content = await fs.readFile(p, 'utf8');
        const outline = await extractSymbolOutline(p, content);
        return { ok: true, result: outline };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'symbol outline failed' };
      }
    }
    case 'local_list_symbols': {
      try {
        const filePath = typeof rawArgs.path === 'string' ? rawArgs.path.trim() : '';
        const name = typeof rawArgs.name === 'string' ? rawArgs.name.trim() : '';
        const pathPrefix =
          typeof rawArgs.path_prefix === 'string' && rawArgs.path_prefix.trim()
            ? rawArgs.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        const params = new URLSearchParams();
        if (filePath) params.set('path', filePath);
        else if (name) {
          params.set('name', name);
          if (pathPrefix) params.set('path_prefix', pathPrefix);
        } else {
          return { ok: false, error: 'path or name is required' };
        }
        const res = await sidecarFetch(`${SERVER_URL}/search/symbols?${params}`, {
          headers: sidecarAuthHeaders(),
        });
        if (!res.ok) {
          return { ok: false, error: `Sidecar returned ${res.status}` };
        }
        const data = await res.json();
        if (data.outline) return { ok: true, result: data.outline };
        const symbols = Array.isArray(data.symbols) ? data.symbols : [];
        const body = symbols.length
          ? symbols.map((s: { kind: string; name: string; path: string; line_start: number }) =>
              `- ${s.kind} **${s.name}** — ${s.path}:${s.line_start}`).join('\n')
          : 'No symbols found.';
        return { ok: true, result: `# Symbols\n\n${body}` };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'symbol search failed' };
      }
    }
    case 'local_git_status': {
      const res = await runGitStatus(rawArgs);
      if (!res.ok) return res;
      const hint = formatEditSessionHint();
      return {
        ok: true,
        result: hint ? `${res.result}\n\n${hint}` : res.result,
      };
    }
    case 'local_git_diff': {
      return runGitDiff(rawArgs);
    }
    case 'local_find_references': {
      const args = applyEditorDefaultsToToolArgs(rawArgs, { symbol: true, path: true });
      const symbol = typeof args.symbol === 'string' ? args.symbol.trim() : '';
      const filePath = typeof args.path === 'string' ? args.path.trim() : '';
      if (symbol && filePath) {
        try {
          const params = new URLSearchParams({ path: filePath, name: symbol });
          const res = await sidecarFetch(`${SERVER_URL}/search/symbol-references?${params}`, {
            headers: sidecarAuthHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.references?.length) {
              const lines = data.references.map(
                (r: { path: string; name: string; line: number | null; kind: string }) =>
                  `- ${r.path}:${r.line ?? '?'} (${r.kind})`,
              );
              const note = data.note ? `\n\n_${data.note}_` : '';
              return { ok: true, result: `Structural references for \`${symbol}\`:\n${lines.join('\n')}${note}` };
            }
          }
        } catch {
          /* fall through to ripgrep */
        }
      }
      return runFindReferences(args);
    }
    case 'local_get_context': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { path: true });
        const input =
          typeof rawArgs.input === 'string'
            ? rawArgs.input.trim()
            : typeof args.path === 'string'
              ? args.path
              : '';
        if (!input) return { ok: false, error: 'input or path is required' };
        const pathPrefix =
          typeof rawArgs.path_prefix === 'string' && rawArgs.path_prefix.trim()
            ? rawArgs.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        const activeFile = typeof args.path === 'string' ? args.path : undefined;
        const res = await sidecarFetch(`${SERVER_URL}/search/context`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({
            input,
            includeSource: Boolean(rawArgs.include_source),
            pathPrefix,
            activeFile,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: `Sidecar returned ${res.status}` };
        }
        const data = await res.json();
        const formatted = formatGetContext(data);
        return { ok: true, result: formatted.result, rawData: formatted.rawData };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'get_context failed' };
      }
    }
    case 'local_go_to_definition': {
      return runGoToDefinition(
        applyEditorDefaultsToToolArgs(rawArgs, { path: true, line: true, character: true }),
      );
    }
    case 'local_import_blast_radius': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { path: true });
        const pathPrefix =
          typeof args.path_prefix === 'string' && args.path_prefix.trim()
            ? args.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        let paths: string[] = Array.isArray(args.paths)
          ? args.paths.filter((p): p is string => typeof p === 'string')
          : [];
        if (!paths.length && typeof args.path === 'string' && args.path.trim()) {
          paths = [args.path.trim()];
        }
        if (!paths.length) {
          paths = getTouchedFilesSnapshot();
        }
        if (!paths.length) {
          return { ok: false, error: 'paths, path, or edit-session files required' };
        }
        const res = await sidecarFetch(`${SERVER_URL}/search/import-graph`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({
            paths,
            pathPrefix,
            maxDepth: typeof args.max_depth === 'number' ? args.max_depth : 4,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: `Sidecar returned ${res.status}` };
        }
        const data = await res.json();
        return { ok: true, result: data.outline ?? JSON.stringify(data, null, 2) };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'import blast radius failed' };
      }
    }
    case 'local_grep':
      return runGrep(rawArgs);
    case 'local_find_callers': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { symbol: true, path: true });
        const pathPrefix =
          typeof args.path_prefix === 'string' && args.path_prefix.trim()
            ? args.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        const qualifiedName =
          typeof args.qualified_name === 'string' && args.qualified_name.trim()
            ? args.qualified_name.trim()
            : typeof args.path === 'string' && typeof args.symbol === 'string'
              ? `${args.path}#${args.symbol}`
              : '';
        if (!qualifiedName) {
          return { ok: false, error: 'qualified_name or path+symbol required' };
        }
        const params = new URLSearchParams({
          qualified_name: qualifiedName,
          path_prefix: pathPrefix,
          maxDepth: String(typeof args.max_depth === 'number' ? args.max_depth : 1),
          min_confidence: typeof args.min_confidence === 'string' ? args.min_confidence : 'static-heuristic',
        });
        const res = await sidecarFetch(`${SERVER_URL}/search/find-callers?${params}`, {
          headers: sidecarAuthHeaders(),
        });
        if (!res.ok) return { ok: false, error: `Sidecar returned ${res.status}` };
        const data = await res.json();
        return { ok: true, result: data.outline ?? JSON.stringify(data, null, 2), rawData: data };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'find_callers failed' };
      }
    }
    case 'local_trace_call_chain': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { symbol: true, path: true });
        const filePath = typeof args.path === 'string' ? args.path.trim() : '';
        const name = typeof args.symbol === 'string' ? args.symbol.trim() : '';
        if (!filePath || !name) return { ok: false, error: 'path and symbol required' };
        const params = new URLSearchParams({
          path: filePath,
          name,
          maxDepth: String(typeof args.max_depth === 'number' ? args.max_depth : 4),
        });
        const res = await sidecarFetch(`${SERVER_URL}/search/call-chain?${params}`, {
          headers: sidecarAuthHeaders(),
        });
        if (!res.ok) return { ok: false, error: `Sidecar returned ${res.status}` };
        const data = await res.json();
        const chain = Array.isArray(data.chain) ? data.chain : [];
        const body = chain.length ? chain.map((s: string) => `- ${s}`).join('\n') : 'No call chain found.';
        const trunc = data.truncated ? '\n\n_(truncated at max depth)_' : '';
        return { ok: true, result: `# Call chain: ${filePath}#${name}\n\n${body}${trunc}`, rawData: data };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'trace_call_chain failed' };
      }
    }
    case 'local_symbol_blast_radius': {
      try {
        const args = applyEditorDefaultsToToolArgs(rawArgs, { symbol: true, path: true });
        const pathPrefix =
          typeof args.path_prefix === 'string' && args.path_prefix.trim()
            ? args.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        const qualifiedName =
          typeof args.qualified_name === 'string' && args.qualified_name.trim()
            ? args.qualified_name.trim()
            : typeof args.path === 'string' && typeof args.symbol === 'string'
              ? `${args.path}#${args.symbol}`
              : '';
        if (!qualifiedName) {
          return { ok: false, error: 'qualified_name or path+symbol required' };
        }
        const res = await sidecarFetch(`${SERVER_URL}/search/symbol-blast-radius`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({
            qualified_name: qualifiedName,
            change_type: typeof args.change_type === 'string' ? args.change_type : 'signature_change',
            path_prefix: pathPrefix,
            max_depth: typeof args.max_depth === 'number' ? args.max_depth : 2,
          }),
        });
        if (!res.ok) return { ok: false, error: `Sidecar returned ${res.status}` };
        const data = await res.json();
        const keys: string[] = [qualifiedName];
        if (typeof args.path === 'string') keys.push(args.path);
        recordBlastRadiusCheck(keys);
        return { ok: true, result: data.outline ?? JSON.stringify(data, null, 2), rawData: data };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'symbol_blast_radius failed' };
      }
    }
    case 'local_type_flow_trace': {
      try {
        const typeName =
          typeof rawArgs.type_name === 'string'
            ? rawArgs.type_name.trim()
            : typeof rawArgs.symbol === 'string'
              ? rawArgs.symbol.trim()
              : '';
        if (!typeName) return { ok: false, error: 'type_name required' };
        const pathPrefix =
          typeof rawArgs.path_prefix === 'string' && rawArgs.path_prefix.trim()
            ? rawArgs.path_prefix.trim()
            : getActiveCodeProjectRootPath() ?? '';
        const params = new URLSearchParams({
          type_name: typeName,
          direction: typeof rawArgs.direction === 'string' ? rawArgs.direction : 'both',
          path_prefix: pathPrefix,
        });
        const res = await sidecarFetch(`${SERVER_URL}/search/type-flow?${params}`, {
          headers: sidecarAuthHeaders(),
        });
        if (!res.ok) return { ok: false, error: `Sidecar returned ${res.status}` };
        const data = await res.json();
        return { ok: true, result: data.outline ?? JSON.stringify(data, null, 2), rawData: data };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'type_flow_trace failed' };
      }
    }
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
        await shell.openPath(p);
        registerAbsolutePathForPreview(p);
        return { ok: true, result: 'File opened in OS' };
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    case 'local_apply_patch':
      return applyLocalPatch(win, rawArgs);
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

function shellChunkChannel(streamId: string): string {
  return `local-desktop-tool-chunk:${streamId}`;
}

async function confirmLocalShellExecution(
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
  try {
    const batch = await executeReadFile(args);
    registerReadFileBatchForPreview(batch.results);
    const firstError = batch.results.find((r) => r.status === 'error');
    if (batch.results.length === 1 && firstError) {
      return { ok: false, error: firstError.error ?? firstError.content };
    }
    const formatted = formatReadFileBatch(batch);
    return { ok: true, result: formatted.result, rawData: formatted.rawData };
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

  const command = typeof args.command === 'string' ? args.command.trim() : '';
  const recursive = !!args.recursive;
  const extensions = Array.isArray(args.extensions)
    ? (args.extensions as string[]).map(e => e.toLowerCase().replace(/^\./, ''))
    : null;
  const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 1000) : 100;

  try {
    const results: Array<{ path: string; name: string; isDir: boolean; size?: number; mtime?: number }> = [];
    let shellCommand = '';
    let terminalOutput: string | undefined;
    let parseRejected = false;

    async function walk(currentPath: string) {
      if (results.length >= limit) return;

      const remaining = limit - results.length;
      const listing = await listDirectoryViaShell(currentPath, {
        limit: remaining,
        command: command || undefined,
      });
      if (!shellCommand) {
        shellCommand = listing.shellCommand;
      }
      if (listing.terminalOutput) {
        terminalOutput = listing.terminalOutput;
      }
      if (listing.parseRejected) {
        parseRejected = true;
      }

      if (!listing.structured) {
        return;
      }

      for (const entry of listing.items) {
        if (results.length >= limit) break;

        if (isIgnored(entry.path)) {
          continue;
        }

        if (entry.isDir) {
          results.push({ path: entry.path, name: entry.name, isDir: true });
          if (recursive && !command) {
            try {
              await walk(entry.path);
            } catch {
              // Skip directories we can't access
            }
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          if (!extensions || extensions.includes(ext)) {
            results.push({
              path: entry.path,
              name: entry.name,
              isDir: false,
              size: entry.size,
              mtime: entry.mtime,
            });
          }
        }
      }
    }

    await walk(dirPath);

    if (command && parseRejected) {
      return {
        ok: false,
        error:
          'Directory listing failed: shell output could not be parsed (table headers like `Name`, `----`, or `Mode` detected). '
          + 'Retry `local_list_directory` with only `{ path: "<absolute directory>" }` and omit `command`.',
      };
    }

    if (command && terminalOutput && results.length === 0) {
      const formatted = formatDirectoryListing({
        path: dirPath,
        items: [],
        shellCommand,
        terminalOutput,
      });
      return {
        ok: true,
        result: formatted.result,
        rawData: formatted.rawData,
      };
    }

    const hitLimit = results.length >= limit;
    const formatted = formatDirectoryListing({
      path: dirPath,
      items: results,
      hitLimit,
      shellCommand,
      terminalOutput,
    });
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
