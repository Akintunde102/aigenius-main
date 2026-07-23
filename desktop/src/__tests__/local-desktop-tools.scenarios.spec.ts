/**
 * Comprehensive scenario tests for all LOCAL_DESKTOP_SUITE tools.
 * Measures per-tool response time (mocked sidecar / local I/O) to catch regressions
 * in the indexer-status path and related delegated tools.
 */
import { performance } from 'node:perf_hooks';
import { runLocalDesktopTool } from '../local-tool-executor';

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

jest.mock('electron', () => ({
  dialog: { showMessageBox: jest.fn().mockResolvedValue({ response: 1 }) },
  shell: { openPath: jest.fn().mockResolvedValue('') },
}));

jest.mock('../resolve-browser-window-for-ipc', () => ({
  resolveBrowserWindowForIpcSender: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../tool-permission-preferences', () => ({
  shouldRequireToolApproval: jest.fn(() => false),
  normalizeDesktopToolId: (id: string) => id,
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
    result: 'Ripgrep references for `helper`:\n- src/util.ts:1',
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
  readFile: jest.fn().mockResolvedValue('export function helper() { return 1; }'),
}));

import fs from 'fs/promises';

const EXECUTOR_BUDGET_MS = 500;

type SidecarHandler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
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
      references: [{ path: '/home/user/project/src/util.ts', name: 'helper', line: 1, kind: 'reference' }],
    });
  }
  if (url.includes('/search/context')) {
    return jsonResponse({ type: 'file', overview: { path: '/home/user/project/src/util.ts' } });
  }
  if (url.includes('/search/import-graph')) {
    return jsonResponse({ outline: '# Import blast radius\n\n**Seeds:** `util.ts`' });
  }
  if (url.includes('/ollama/connect')) {
  return jsonResponse({ ok: true });
  }
  if (url.includes('localhost:11434/api/tags')) {
    return jsonResponse({ models: [{ name: 'llama3' }] });
  }
  return jsonResponse({ error: `unmocked: ${url} ${init?.method ?? 'GET'}` }, 404);
};

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
    (fs.readdir as jest.Mock).mockResolvedValue([
      { name: 'util.ts', isDirectory: () => false },
      { name: 'lib', isDirectory: () => true },
    ]);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 128, mtimeMs: 1_700_000_000_000 });
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
        read: jest.fn().mockResolvedValue({ bytesRead: 12 }),
        close: jest.fn(),
      };
      (fs.open as jest.Mock).mockResolvedValue(mockFd);
      const { out } = await runTimedTool('local_read_file', {
        path: '/home/user/project/src/util.ts',
        max_bytes: 1000,
      });
      if (out.ok) expect(out.result).toContain('Read file');
    });

    it('local_list_directory lists entries', async () => {
      const { out } = await runTimedTool('local_list_directory', { path: '/home/user/project' });
      if (out.ok) {
        expect(out.result).toContain('Directory listing');
        expect(out.result).toContain('util.ts');
      }
    });

    it('local_symbol_outline extracts symbols', async () => {
      const { out } = await runTimedTool('local_symbol_outline', {
        path: '/home/user/project/src/util.ts',
      });
      if (out.ok) expect(out.result).toContain('Symbol outline');
    });

    it('local_list_symbols queries sidecar', async () => {
      const { out } = await runTimedTool('local_list_symbols', {
        path: '/home/user/project/src/util.ts',
      });
      if (out.ok) expect(out.result).toContain('Symbols');
    });

    it('local_get_context resolves file overview', async () => {
      const { out } = await runTimedTool('local_get_context', {
        path: '/home/user/project/src/util.ts',
      });
      if (out.ok) expect(out.result).toContain('util.ts');
    });

    it('local_find_references uses structural index first', async () => {
      const { out } = await runTimedTool('local_find_references', {
        symbol: 'helper',
        path: '/home/user/project/src/util.ts',
      });
      if (out.ok) expect(out.result).toContain('Structural references');
    });

    it('local_go_to_definition delegates to LSP helper', async () => {
      const { out } = await runTimedTool('local_go_to_definition', {
        path: '/home/user/project/src/util.ts',
        line: 1,
        character: 17,
      });
      if (out.ok) expect(out.result).toContain('Definition');
    });

    it('local_import_blast_radius posts to import-graph', async () => {
      const { out } = await runTimedTool('local_import_blast_radius', {
        paths: ['/home/user/project/src/util.ts'],
      });
      if (out.ok) expect(out.result).toContain('Import blast radius');
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
