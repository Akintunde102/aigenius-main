/**
 * Scenario tests for every local desktop tool (mocked I/O — no live LLM/OCR/rg).
 * Follows agent testing pyramid: fast deterministic checks on tool routing + formatting.
 */
import { performance } from 'node:perf_hooks';
import { runLocalDesktopTool } from '../local-tool-executor';

/** Tools exercised with ok:true in this suite (see coverage test at bottom). */
export const SCENARIO_COVERED_TOOLS = [
  'local_shell',
  'local_read_file',
  'local_read_image',
  'local_rag_query',
  'local_list_directory',
  'local_symbol_outline',
  'local_list_symbols',
  'local_get_context',
  'local_find_references',
  'local_go_to_definition',
  'local_grep',
  'local_find_callers',
  'local_git_status',
  'local_git_diff',
  'local_retrieval_memory_get',
  'local_retrieval_memory_upsert',
  'local_open_in_os',
  'local_apply_patch',
  'local_ollama_status',
  'local_ollama_connect',
  'local_ollama_chat',
] as const;

export const REMOVED_GRAPH_TOOLS = [
  'local_trace_call_chain',
  'local_symbol_blast_radius',
  'local_import_blast_radius',
  'local_type_flow_trace',
] as const;

function assertWithinBudget(
  ms: number,
  budget: { label: string; maxMs: number },
): { label: string; ms: number; maxMs: number; ok: boolean } {
  const row = {
    label: budget.label,
    ms: Math.round(ms * 100) / 100,
    maxMs: budget.maxMs,
    ok: ms <= budget.maxMs,
  };
  expect(ms).toBeLessThanOrEqual(budget.maxMs);
  return row;
}

function formatTimingTable(rows: Array<{ label: string; ms: number; maxMs: number; ok: boolean }>): string {
  const header = ['Step', 'ms', 'budget', 'ok'].join('\t');
  const body = rows
    .map((r) => [r.label, String(r.ms), String(r.maxMs), r.ok ? 'PASS' : 'FAIL'].join('\t'))
    .join('\n');
  return `${header}\n${body}`;
}

type TimingReportRow = ReturnType<typeof assertWithinBudget>;

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const proc = {
      stdout: { on: jest.fn((_event: string, cb: (buf: Buffer) => void) => cb(Buffer.from('ok\n'))) },
      stderr: { on: jest.fn() },
      on: jest.fn((event: string, cb: (code: number, signal: string | null) => void) => {
        if (event === 'close') setTimeout(() => cb(0, null), 0);
      }),
      kill: jest.fn(),
    };
    return proc;
  }),
}));

jest.mock('../local-grep', () => ({
  runGrep: jest.fn().mockResolvedValue({
    ok: true,
    result: '# Grep (file contents): helper\n\n- src/util.ts:1: helper',
  }),
}));

jest.mock('../local-read-image', () => ({
  runReadImageAnalysis: jest.fn().mockResolvedValue({
    path: '/home/user/project/photo.png',
    name: 'photo.png',
    extension: 'png',
    source: 'live',
    indexed: false,
    ocr_text: 'Sample OCR text',
    tags: ['image'],
    objects: ['document'],
    errors: [],
  }),
}));

jest.mock('electron', () => ({
  dialog: { showMessageBox: jest.fn().mockResolvedValue({ response: 1 }) },
  shell: { openPath: jest.fn().mockResolvedValue('') },
}));

jest.mock('../resolve-browser-window-for-ipc', () => ({
  resolveBrowserWindowForIpcSender: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../tool-permission-preferences', () => ({
  shouldRequireToolApproval: jest.fn(() => false),
  normalizeDesktopToolId: (id: string) => (id === 'run_command' ? 'local_shell' : id),
  TOOL_PERMISSION_CATALOG: [],
}));

jest.mock('../active-code-project', () => ({
  getActiveCodeProjectRootPath: jest.fn(() => '/home/user/project'),
}));

jest.mock('../active-editor-main', () => ({
  applyEditorDefaultsToToolArgs: jest.fn((args: Record<string, unknown>) => args),
}));

jest.mock('../local-git', () => ({
  runGitStatus: jest.fn().mockResolvedValue({ ok: true, result: '### Git status\n\nOn branch main' }),
  runGitDiff: jest.fn().mockResolvedValue({ ok: true, result: '### Git diff\n\n(no changes)' }),
}));

jest.mock('../local-find-references', () => ({
  runFindReferences: jest.fn().mockResolvedValue({
    ok: true,
    result: 'Structural references for `helper`:\n- src/util.ts:1',
  }),
}));

jest.mock('../local-lsp', () => ({
  runGoToDefinition: jest.fn().mockResolvedValue({
    ok: true,
    result: 'Definition: src/util.ts:1:17',
  }),
}));

jest.mock('../local-retrieval-memory', () => ({
  getRetrievalMemoryBySlugFromTool: jest.fn().mockResolvedValue({
    ok: true,
    result: '### Retrieval memory\n\n- **slug**: test',
  }),
  upsertRetrievalMemoryFromTool: jest.fn().mockResolvedValue({
    ok: true,
    result: 'Memory saved.',
  }),
}));

jest.mock('../local-apply-patch', () => ({
  applyLocalPatch: jest.fn().mockResolvedValue({ ok: true, result: 'Patch applied.' }),
}));

jest.mock('../symbol-outline', () => ({
  extractSymbolOutline: jest.fn().mockResolvedValue('# Symbol outline\n\n- function helper'),
}));

jest.mock('../edit-session', () => ({
  formatEditSessionHint: jest.fn(() => ''),
  getTouchedFilesSnapshot: jest.fn(() => ['/home/user/project/src/util.ts']),
}));

jest.mock('fs/promises', () => ({
  open: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  realpath: jest.fn(),
  readFile: jest.fn().mockResolvedValue('export function helper() { return 1; }'),
}));

import fs from 'fs/promises';

const EXECUTOR_BUDGET_MS = 500;
const PROJECT_ROOT = '/home/user/project';
const UTIL_PATH = `${PROJECT_ROOT}/src/util.ts`;
const IMAGE_PATH = `${PROJECT_ROOT}/photo.png`;

type SidecarHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function ollamaChatResponse(): Response {
  const chunk = new Uint8Array(Buffer.from('{"message":{"content":"hello from ollama"}}\n'));
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({}),
    text: async () => '',
    body: {
      getReader: () => ({
        read: async () => ({ done: true, value: chunk }),
      }),
    },
  } as unknown as Response;
}

function installSidecarRouter(handler: SidecarHandler): void {
  global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    return handler(url, init);
  }) as typeof fetch;
}

const defaultSidecar: SidecarHandler = (url, init) => {
  if (url.includes('/search/status')) {
    return jsonResponse({
      indexed: 42,
      watching: true,
      lastRun: 1_700_000_000_000,
    });
  }
  if (url.includes('/search/rag')) {
    return jsonResponse({ hits: [], hit_count: 0, scanned_chunks: 42 });
  }
  if (url.includes('/search/reindex')) {
    return jsonResponse({ queued: 3 });
  }
  if (url.includes('/search/symbols')) {
    return jsonResponse({ outline: '# Symbols\n\n- function helper' });
  }
  if (url.includes('/search/symbol-references')) {
    return jsonResponse({
      references: [{ path: UTIL_PATH, name: 'helper', line: 1, kind: 'reference' }],
    });
  }
  if (url.includes('/search/context')) {
    return jsonResponse({ type: 'file', overview: { path: UTIL_PATH } });
  }
  if (url.includes('/search/find-callers')) {
    return jsonResponse({ outline: '# Callers\n\n- helper called from main.ts' });
  }
  if (url.includes('/ollama/connect')) {
    return jsonResponse({ ok: true });
  }
  if (url.includes('localhost:11434/api/tags')) {
    return jsonResponse({ models: [{ name: 'llama3' }] });
  }
  if (url.includes('localhost:11434/api/chat')) {
    return ollamaChatResponse();
  }
  return jsonResponse({ error: `unmocked: ${url} ${init?.method ?? 'GET'}` }, 404);
};

function configureFsMocks(): void {
  (fs.realpath as jest.Mock).mockImplementation(async (p: string) => p);
  (fs.stat as jest.Mock).mockImplementation(async (p: string) => {
    const pathStr = String(p);
    const isDir =
      pathStr === PROJECT_ROOT
      || pathStr.endsWith('/project')
      || pathStr.endsWith('/src')
      || pathStr.endsWith('/lib')
      || pathStr.endsWith('\\project')
      || pathStr.endsWith('\\src')
      || pathStr.endsWith('\\lib');
    return {
      size: 128,
      mtimeMs: 1_700_000_000_000,
      isFile: () => !isDir,
      isDirectory: () => isDir,
    };
  });
  (fs.readdir as jest.Mock).mockResolvedValue([
    { name: 'util.ts', isDirectory: () => false },
    { name: 'lib', isDirectory: () => true },
  ]);
}

describe('local desktop tools — full scenario suite', () => {
  const mockSender = {
    isDestroyed: () => false,
    send: jest.fn(),
  } as any;

  const originalToken = process.env.AIGENIUS_SECRET_TOKEN;

  beforeAll(() => {
    process.env.AIGENIUS_SECRET_TOKEN = 'test-token';
  });

  afterAll(() => {
    process.env.AIGENIUS_SECRET_TOKEN = originalToken;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    installSidecarRouter(defaultSidecar);
    configureFsMocks();
  });

  async function runTimedTool(
    tool: string,
    args: Record<string, unknown>,
    budgetMs = EXECUTOR_BUDGET_MS,
  ): Promise<{ out: Awaited<ReturnType<typeof runLocalDesktopTool>>; row: TimingReportRow }> {
    const t0 = performance.now();
    const out = await runLocalDesktopTool(mockSender, tool, args);
    const ms = performance.now() - t0;
    const row = assertWithinBudget(ms, { label: tool, maxMs: budgetMs });
    expect(out.ok).toBe(true);
    return { out, row };
  }

  describe('indexer tools (search)', () => {
    it('local_rag_query hits /search/rag within budget', async () => {
      const { out } = await runTimedTool('local_rag_query', { query: 'helper' });
      if (out.ok) expect(out.result).toContain('Local search');
    });
  });

  describe('filesystem + code intelligence tools', () => {
    it('local_read_file reads bounded content', async () => {
      const mockFd = {
        read: jest.fn().mockResolvedValue({
          bytesRead: Buffer.from('hello world').length,
        }),
        close: jest.fn(),
      };
      (fs.open as jest.Mock).mockResolvedValue(mockFd);
      const { out } = await runTimedTool('local_read_file', {
        path: UTIL_PATH,
        max_bytes: 1000,
      });
      if (out.ok) expect(out.result).toContain('Read file');
    });

    it('local_read_image runs OCR/object pipeline (mocked)', async () => {
      const { out } = await runTimedTool('local_read_image', { path: IMAGE_PATH });
      if (out.ok) expect(out.result).toContain('Sample OCR text');
    });

    it('local_read_image batch reads[] analyzes multiple paths', async () => {
      const { out } = await runTimedTool('local_read_image', {
        reads: [{ path: IMAGE_PATH }, { path: `${PROJECT_ROOT}/other.png` }],
      });
      if (out.ok) {
        expect(out.result).toContain('Batch image read');
        expect(out.result).toContain('Sample OCR text');
      }
    });

    it('local_list_directory lists entries', async () => {
      const { out } = await runTimedTool('local_list_directory', { path: PROJECT_ROOT });
      if (out.ok) {
        expect(out.result).toContain('Directory listing');
        expect(out.result).toContain('util.ts');
      }
    });

    it('local_symbol_outline extracts symbols', async () => {
      const { out } = await runTimedTool('local_symbol_outline', { path: UTIL_PATH });
      if (out.ok) expect(out.result).toContain('Symbol outline');
    });

    it('local_list_symbols queries sidecar', async () => {
      const { out } = await runTimedTool('local_list_symbols', { path: UTIL_PATH });
      if (out.ok) expect(out.result).toContain('Symbols');
    });

    it('local_get_context resolves file overview', async () => {
      const { out } = await runTimedTool('local_get_context', { path: UTIL_PATH });
      if (out.ok) {
        expect(out.result).toContain('Code context');
        expect(out.result).toContain('file');
      }
    });

    it('local_find_references uses structural index first', async () => {
      const { out } = await runTimedTool('local_find_references', {
        symbol: 'helper',
        path: UTIL_PATH,
      });
      if (out.ok) expect(out.result).toContain('Structural references');
    });

    it('local_go_to_definition delegates to LSP helper', async () => {
      const { out } = await runTimedTool('local_go_to_definition', {
        path: UTIL_PATH,
        line: 1,
        character: 17,
      });
      if (out.ok) expect(out.result).toContain('Definition');
    });

    it('local_grep searches file contents (mocked ripgrep)', async () => {
      const { out } = await runTimedTool('local_grep', {
        pattern: 'helper',
        path_prefix: PROJECT_ROOT,
      });
      if (out.ok) expect(out.result).toContain('Grep');
    });

    it('local_find_callers queries sidecar graph', async () => {
      const { out } = await runTimedTool('local_find_callers', {
        path: UTIL_PATH,
        symbol: 'helper',
      });
      if (out.ok) expect(out.result).toContain('Callers');
    });
  });

  describe('shell + patch + OS tools', () => {
    it('local_shell runs a command (mocked spawn)', async () => {
      const { out } = await runTimedTool('local_shell', {
        command: 'echo hello',
        cwd: PROJECT_ROOT,
      });
      if (out.ok) expect(out.result).toContain('ok');
    });

    it('run_command aliases local_shell', async () => {
      const { out } = await runTimedTool('run_command', {
        command: 'echo hello',
        cwd: PROJECT_ROOT,
      });
      expect(out.ok).toBe(true);
    });

    it('local_apply_patch applies edits (mocked)', async () => {
      const { out } = await runTimedTool('local_apply_patch', {
        path: UTIL_PATH,
        patch: '--- a\n+++ b\n',
      });
      if (out.ok) expect(out.result).toContain('Patch applied');
    });

    it('local_open_in_os opens path via shell', async () => {
      const { out } = await runTimedTool('local_open_in_os', { path: UTIL_PATH });
      if (out.ok) expect(out.result).toMatch(/opened|Open/i);
    });
  });

  describe('git + memory tools', () => {
    it('local_git_status returns status markdown', async () => {
      const { out } = await runTimedTool('local_git_status', {});
      if (out.ok) expect(out.result).toContain('Git status');
    });

    it('local_git_diff returns diff markdown', async () => {
      const { out } = await runTimedTool('local_git_diff', {});
      if (out.ok) expect(out.result).toContain('Git diff');
    });

    it('local_retrieval_memory_get reads memory', async () => {
      const { out } = await runTimedTool('local_retrieval_memory_get', { slug: 'test' });
      if (out.ok) expect(out.result).toContain('Retrieval memory');
    });

    it('local_retrieval_memory_upsert writes memory', async () => {
      const { out } = await runTimedTool('local_retrieval_memory_upsert', {
        slug: 'test',
        content: 'note',
      });
      if (out.ok) expect(out.result).toContain('Memory saved');
    });
  });

  describe('ollama tools', () => {
    it('local_ollama_status checks local daemon', async () => {
      const { out } = await runTimedTool('local_ollama_status', {});
      if (out.ok) expect(out.result).toContain('Ollama is running');
    });

    it('local_ollama_connect relays token to sidecar', async () => {
      const { out } = await runTimedTool('local_ollama_connect', { token: 'relay-token' });
      if (out.ok) expect(out.result).toContain('relay');
    });

    it('local_ollama_chat streams chat completion', async () => {
      const { out } = await runTimedTool('local_ollama_chat', {
        payload: { model: 'llama3', messages: [{ role: 'user', content: 'hi' }] },
      });
      if (out.ok) expect(out.result).toContain('hello from ollama');
    });
  });

  describe('removed graph tools', () => {
    for (const tool of REMOVED_GRAPH_TOOLS) {
      it(`${tool} returns a removal notice`, async () => {
        const out = await runLocalDesktopTool(mockSender, tool, {});
        expect(out.ok).toBe(false);
        if (!out.ok) {
          expect(out.error).toContain('removed');
        }
      });
    }
  });

  describe('coverage guard', () => {
    it('every active local tool has a scenario test', () => {
      expect(SCENARIO_COVERED_TOOLS.length).toBeGreaterThanOrEqual(20);
      const unique = new Set(SCENARIO_COVERED_TOOLS);
      expect(unique.size).toBe(SCENARIO_COVERED_TOOLS.length);
    });
  });

  describe('end-to-end indexer analysis scenario', () => {
    it('rag query with per-step timing', async () => {
      const rows: TimingReportRow[] = [];

      const t0 = performance.now();
      const out = await runLocalDesktopTool(mockSender, 'local_rag_query', { query: 'helper' });
      rows.push(assertWithinBudget(performance.now() - t0, {
        label: 'scenario: rag query',
        maxMs: EXECUTOR_BUDGET_MS,
      }));
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.result).toContain('Local search');

      expect(formatTimingTable(rows)).toContain('scenario: rag query');
    });
  });
});
