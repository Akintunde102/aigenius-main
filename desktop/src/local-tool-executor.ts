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
  formatReadImage,
  formatReadImageBatch,
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
import { resolveReadFilePath, resolveLocalImagePath } from './utils/read-file/path-resolver';
import { runReadImageAnalysis } from './local-read-image';
import { runReadImageAnalysisBatch } from './local-read-image-batch';
import {
  registerRagHitsForPreview,
  registerReadFileBatchForPreview,
  registerReadImageBatchForPreview,
  registerAbsolutePathForPreview,
} from './utils/register-preview-paths';
import { formatEditSessionHint, getTouchedFilesSnapshot } from './edit-session';
import { applyEditorDefaultsToToolArgs } from './active-editor-main';
import { sidecarFetch } from './sidecar-fetch';
import { MINI_SERVER_PORT } from './mini-server-port';

const MAX_CMD_LEN = 64_000;
const MAX_SHELL_OUT = 512 * 1024;
const SHELL_APPROVAL_FALLBACK_PREVIEW_MAX = 2000;
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

export { resolveShellProcessClose } from './utils/shell-process-close';

import {
  confirmGenericToolExecution,
  toolHasDedicatedApprovalUi,
} from './local-tool-executor-helpers';
import { runShell, connectLocalOllamaRelay } from './local-tool-executor-shell';
import { readBoundedFile, listLocalDirectory } from './local-tool-executor-fs';
import { checkLocalOllamaStatus, runLocalOllamaChat } from './local-tool-executor-ollama';
import { sidecarAuthHeaders } from './local-tool-executor-helpers';
import { executeSidecarTool } from './sidecar-tools';

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
    case 'read_file': {
      const sidecarRead = await executeSidecarTool(tool, rawArgs);
      if (sidecarRead) {
        return sidecarRead;
      }
      return readBoundedFile(rawArgs);
    }
    case 'local_read_image': {
      try {
        const readsRaw = rawArgs.reads;
        if (Array.isArray(readsRaw) && readsRaw.length > 0) {
          const url = typeof rawArgs.url === 'string' ? rawArgs.url.trim() : '';
          const singlePath = typeof rawArgs.path === 'string' ? rawArgs.path.trim() : '';
          if (url || singlePath) {
            return { ok: false, error: 'provide reads[] OR path/url, not both' };
          }

          const reads: { path: string }[] = [];
          for (const item of readsRaw) {
            if (!item || typeof item !== 'object') continue;
            const p = (item as { path?: unknown }).path;
            if (typeof p === 'string' && p.trim()) reads.push({ path: p.trim() });
          }
          if (reads.length === 0) {
            return { ok: false, error: 'reads[] must include at least one path' };
          }
          if (reads.length > 20) {
            return { ok: false, error: 'reads[] max 20 paths per call' };
          }

          const maxImages =
            typeof rawArgs.max_images === 'number' ? rawArgs.max_images : undefined;
          const batch = await runReadImageAnalysisBatch({
            reads,
            preferIndex: rawArgs.prefer_index !== false,
            forceLive: rawArgs.force_live === true,
            maxImages,
          });
          registerReadImageBatchForPreview(batch.results);
          const formatted = formatReadImageBatch(batch);
          return { ok: true, result: formatted.result, rawData: formatted.rawData };
        }

        const url = typeof rawArgs.url === 'string' ? rawArgs.url.trim() : '';
        let filePath = typeof rawArgs.path === 'string' ? rawArgs.path.trim() : '';
        if (!url && !filePath) {
          return { ok: false, error: 'path or url required' };
        }
        if (url && filePath) {
          return { ok: false, error: 'provide either path or url, not both' };
        }
        if (filePath) {
          const pathResult = await resolveLocalImagePath(filePath);
          if (!pathResult.ok) {
            return { ok: false, error: pathResult.error };
          }
          filePath = pathResult.resolved;
        }
        const data = await runReadImageAnalysis({
          filePath: filePath || undefined,
          url: url || undefined,
          preferIndex: rawArgs.prefer_index !== false,
          forceLive: rawArgs.force_live === true,
        });
        const formatted = formatReadImage(data);
        return { ok: true, result: formatted.result, rawData: formatted.rawData };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'read image failed';
        if (/Cannot find module.*read-image|ENOENT.*read-image/i.test(msg)) {
          return {
            ok: false,
            error:
              'Image analysis runtime is missing. Rebuild the desktop app (`npm run build:server` in client/desktop, then restart).',
          };
        }
        return { ok: false, error: msg };
      }
    }
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
        const page = typeof rawArgs.page === 'number' ? rawArgs.page : 0;
        const pageSize =
          typeof rawArgs.page_size === 'number'
            ? rawArgs.page_size
            : topK;
        const prefix =
          typeof rawArgs.path_prefix === 'string' && rawArgs.path_prefix.trim()
            ? rawArgs.path_prefix.trim()
            : (getActiveCodeProjectRootPath() ?? '');

        const extensions = Array.isArray(rawArgs.extensions) ? rawArgs.extensions : undefined;
        const res = await sidecarFetch(`${SERVER_URL}/search/rag`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...sidecarAuthHeaders() },
          body: JSON.stringify({ contentQuery, pathQuery, topK: pageSize, page, page_size: pageSize, pathPrefix: prefix, extensions }),
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
      const sidecarGit = await executeSidecarTool('local_git_status', rawArgs);
      if (sidecarGit?.ok) {
        const hint = formatEditSessionHint();
        return {
          ok: true,
          result: hint ? `${sidecarGit.result}\n\n${hint}` : sidecarGit.result,
        };
      }
      const res = await runGitStatus(rawArgs);
      if (!res.ok) return res;
      const hint = formatEditSessionHint();
      return {
        ok: true,
        result: hint ? `${res.result}\n\n${hint}` : res.result,
      };
    }
    case 'local_git_diff': {
      const sidecarDiff = await executeSidecarTool('local_git_diff', rawArgs);
      if (sidecarDiff) {
        return sidecarDiff;
      }
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
      const args = applyEditorDefaultsToToolArgs(rawArgs, { path: true, line: true, character: true });
      const filePath = typeof args.path === 'string' ? args.path.trim() : '';
      const line = typeof args.line === 'number' ? args.line : 1;
      const character = typeof args.character === 'number' ? args.character : 1;
      if (!filePath) return { ok: false, error: 'path is required (absolute file path)' };

      try {
        const params = new URLSearchParams({
          path: filePath,
          line: String(line),
          character: String(character),
        });
        const res = await sidecarFetch(`${SERVER_URL}/search/go-to-definition?${params}`, {
          headers: sidecarAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.result === 'string') {
            return { ok: true, result: data.result };
          }
        }
      } catch {
        /* fall through to optional LSP */
      }

      return runGoToDefinition(args);
    }
    case 'local_grep': {
      const sidecarGrep = await executeSidecarTool('local_grep', rawArgs);
      if (sidecarGrep) {
        return sidecarGrep;
      }
      return runGrep(rawArgs);
    }
    case 'local_trace_call_chain':
    case 'local_symbol_blast_radius':
    case 'local_import_blast_radius':
    case 'local_type_flow_trace':
      return {
        ok: false,
        error:
          'This graph tool was removed (too slow). Use local_find_callers and local_grep instead.',
      };
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

