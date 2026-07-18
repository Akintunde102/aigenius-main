import type { Hono } from 'hono';
import {
  assertWithinBudget,
  formatTimingTable,
  type TimingReportRow,
} from '../__tests__/timing.utils.js';

const TEST_TOKEN = 'test-secret-token';
const mockQueuePush = jest.fn();

const mockGetStatusSnapshot = jest.fn();
const mockUpdateSearchStatusCache = jest.fn();
const mockRagQueryHybrid = jest.fn();
const mockListSymbolsForFile = jest.fn();
const mockGetContext = jest.fn();

jest.mock('../config/server-env.js', () => ({
  aigeniusSecretToken: TEST_TOKEN,
  serverPort: 8001,
  serverHostname: 'localhost',
  upstreamApiUrl: 'http://localhost:8000',
  corsAllowedOrigins: () => ['http://localhost:23001'],
}));

jest.mock('../search/db/connection.js', () => ({
  getDb: jest.fn(() => ({})),
  closeDb: jest.fn(),
  getActiveDbPath: jest.fn(() => '/tmp/aigenius-test.sqlite'),
}));

jest.mock('../search/index.js', () => ({
  getSearchQueue: () => ({ push: mockQueuePush, pendingCount: () => 0 }),
  getSearchWatchPaths: () => ['/home/user/project'],
  closeSearchModule: jest.fn(),
  switchSearchProject: jest.fn(),
}));

jest.mock('../sidecar/index.js', () => ({
  stopVoiceSidecar: jest.fn(),
}));

jest.mock('../search/status-snapshot.js', () => ({
  getSearchStatusSnapshot: (...args: unknown[]) => mockGetStatusSnapshot(...args),
  updateSearchStatusCache: (...args: unknown[]) => mockUpdateSearchStatusCache(...args),
}));

jest.mock('../search/db/queries.js', () => ({
  searchFiles: jest.fn(),
  deleteFile: jest.fn(),
  ragQuery: jest.fn(),
  browseFileIndex: jest.fn(),
  browseFolderGroups: jest.fn(),
  browseExplorerDirectory: jest.fn(),
  getFileIndexRow: jest.fn(),
}));

jest.mock('../search/embedding/hybrid-search.js', () => ({
  ragQueryHybrid: (...args: unknown[]) => mockRagQueryHybrid(...args),
}));

jest.mock('../search/db/queries-chunks.js', () => ({
  listSymbolsForFile: (...args: unknown[]) => mockListSymbolsForFile(...args),
  searchSymbolsByName: jest.fn(),
  formatSymbolOutline: jest.fn(() => '# Symbols\n\n- function helper'),
  buildProjectArchitecture: jest.fn(),
}));

jest.mock('../search/db/queries-intelligence.js', () => ({
  getContext: (...args: unknown[]) => mockGetContext(...args),
  getFileOverview: jest.fn(),
  getSymbolDetail: jest.fn(),
  findSymbolReferences: jest.fn(),
  traceCallChain: jest.fn(),
  listBoundaries: jest.fn(),
  getMakefileTargets: jest.fn(),
}));

import { createSearchRoutes } from './search.routes.js';
import { timed } from '../__tests__/timing.utils.js';

const STATUS_BUDGET_MS = 200;
const RAG_BUDGET_MS = 800;
const RESCAN_BUDGET_MS = 150;
const SYMBOLS_BUDGET_MS = 300;
const CONTEXT_BUDGET_MS = 500;

async function searchRequest(
  app: Hono,
  method: string,
  routePath: string,
  options?: { body?: unknown; token?: string | null },
): Promise<{ status: number; body: unknown; ms: number }> {
  const headers: Record<string, string> = {};
  const token = options?.token === null ? null : (options?.token ?? TEST_TOKEN);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options?.body !== undefined) headers['Content-Type'] = 'application/json';

  const { ms, result: res } = await timed(() =>
    app.request(routePath, {
      method,
      headers,
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    }),
  );

  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();
  return { status: res.status, body, ms };
}

describe('local desktop search routes (scenario + timing)', () => {
  let app: Hono;

  beforeEach(() => {
    mockQueuePush.mockClear();
    mockGetStatusSnapshot.mockReset();
    mockUpdateSearchStatusCache.mockReset();
    mockRagQueryHybrid.mockReset();
    mockListSymbolsForFile.mockReset();
    mockGetContext.mockReset();

    mockGetStatusSnapshot.mockReturnValue({
      indexed: 0,
      watching: true,
      lastRun: 0,
      scan_in_progress: false,
      queue_depth: 0,
      db_path: '/tmp/aigenius-test.sqlite',
    });
    mockRagQueryHybrid.mockResolvedValue({ hits: [], hit_count: 0, scanned_chunks: 0 });
    mockListSymbolsForFile.mockReturnValue([]);
    mockGetContext.mockResolvedValue({
      type: 'file',
      overview: { path: '/home/user/project/src/util.ts' },
    });

    app = createSearchRoutes();
    process.env.AIGENIUS_DB_PATH = '/tmp/aigenius-test.sqlite';
    process.env.AIGENIUS_MODELS_DIR = '';
  });

  describe('GET /search/status (indexer status)', () => {
    it('rejects missing auth', async () => {
      const res = await searchRequest(app, 'GET', '/status', { token: null });
      expect(res.status).toBe(401);
    });

    it('rejects invalid auth', async () => {
      const res = await searchRequest(app, 'GET', '/status', { token: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('returns status payload quickly on empty index', async () => {
      const res = await searchRequest(app, 'GET', '/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        indexed: 0,
        watching: true,
        lastRun: 0,
        scan_in_progress: false,
        queue_depth: 0,
        db_path: '/tmp/aigenius-test.sqlite',
      });
      expect(mockGetStatusSnapshot).toHaveBeenCalled();
      assertWithinBudget(res.ms, { label: 'GET /search/status (empty)', maxMs: STATUS_BUDGET_MS });
    });

    it('returns counts for populated index within budget', async () => {
      mockGetStatusSnapshot.mockReturnValue({
        indexed: 2,
        watching: true,
        lastRun: 1_700_000_100_000,
        scan_in_progress: false,
        queue_depth: 0,
        db_path: '/tmp/aigenius-test.sqlite',
      });

      const res = await searchRequest(app, 'GET', '/status');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        indexed: 2,
        watching: true,
        lastRun: 1_700_000_100_000,
      });
      assertWithinBudget(res.ms, { label: 'GET /search/status (2 files)', maxMs: STATUS_BUDGET_MS });
    });

    it('stays fast under repeated calls (p95)', async () => {
      mockGetStatusSnapshot.mockReturnValue({
        indexed: 50,
        watching: true,
        lastRun: 1_700_000_000_050,
        scan_in_progress: true,
        queue_depth: 3,
        db_path: '/tmp/aigenius-test.sqlite',
      });

      const samples: number[] = [];
      for (let i = 0; i < 20; i += 1) {
        const res = await searchRequest(app, 'GET', '/status');
        expect(res.status).toBe(200);
        samples.push(res.ms);
      }
      samples.sort((a, b) => a - b);
      const p95 = samples[Math.floor(samples.length * 0.95)] ?? 0;
      assertWithinBudget(p95, { label: 'GET /search/status p95 (50 files)', maxMs: STATUS_BUDGET_MS });
    });
  });

  describe('POST /search/rag', () => {
    it('returns empty hits within budget', async () => {
      const res = await searchRequest(app, 'POST', '/rag', {
        body: { contentQuery: 'helper', topK: 5 },
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ hits: [], hit_count: 0 });
      expect(mockRagQueryHybrid).toHaveBeenCalled();
      assertWithinBudget(res.ms, { label: 'POST /search/rag (empty)', maxMs: RAG_BUDGET_MS });
    });
  });

  describe('POST /search/reindex', () => {
    it('queues paths and responds quickly', async () => {
      const res = await searchRequest(app, 'POST', '/reindex', {
        body: { paths: ['/home/user/project/src/util.ts'] },
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ queued: 1 });
      expect(mockQueuePush).toHaveBeenCalledWith({
        type: 'change',
        path: '/home/user/project/src/util.ts',
        force: false,
      });
      assertWithinBudget(res.ms, { label: 'POST /search/reindex', maxMs: RESCAN_BUDGET_MS });
    });
  });

  describe('GET /search/symbols', () => {
    it('returns outline within budget', async () => {
      const res = await searchRequest(
        app,
        'GET',
        `/symbols?path=${encodeURIComponent('/home/user/project/src/util.ts')}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('outline');
      assertWithinBudget(res.ms, { label: 'GET /search/symbols', maxMs: SYMBOLS_BUDGET_MS });
    });
  });

  describe('POST /search/context', () => {
    it('resolves file context within budget', async () => {
      const res = await searchRequest(app, 'POST', '/context', {
        body: { input: '/home/user/project/src/util.ts', pathPrefix: '/home/user/project' },
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ type: 'file' });
      assertWithinBudget(res.ms, { label: 'POST /search/context', maxMs: CONTEXT_BUDGET_MS });
    });
  });

  describe('full indexer workflow scenario', () => {
    it('status → rag → rescan → status with per-step timing budgets', async () => {
      const rows: TimingReportRow[] = [];

      let res = await searchRequest(app, 'GET', '/status');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ indexed: 0 });
      rows.push(assertWithinBudget(res.ms, { label: '1. initial status', maxMs: STATUS_BUDGET_MS }));

      mockGetStatusSnapshot.mockReturnValue({
        indexed: 1,
        watching: true,
        lastRun: 1_700_000_000_000,
        scan_in_progress: false,
        queue_depth: 0,
        db_path: '/tmp/aigenius-test.sqlite',
      });
      mockRagQueryHybrid.mockResolvedValue({
        hits: [{ path: '/home/user/project/src/util.ts', name: 'util.ts', score: 1, snippet: 'helper' }],
        hit_count: 1,
        scanned_chunks: 1,
      });

      res = await searchRequest(app, 'POST', '/rag', {
        body: { contentQuery: 'helper', topK: 5, pathPrefix: '/home/user/project' },
      });
      expect(res.status).toBe(200);
      rows.push(assertWithinBudget(res.ms, { label: '2. rag query', maxMs: RAG_BUDGET_MS }));

      res = await searchRequest(app, 'POST', '/reindex', {
        body: { paths: ['/home/user/project/src/util.ts'], force: true },
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ queued: 1 });
      rows.push(assertWithinBudget(res.ms, { label: '3. queue rescan', maxMs: RESCAN_BUDGET_MS }));

      res = await searchRequest(app, 'GET', '/status');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ indexed: 1, lastRun: 1_700_000_000_000 });
      rows.push(assertWithinBudget(res.ms, { label: '4. final status', maxMs: STATUS_BUDGET_MS }));

      expect(formatTimingTable(rows)).toContain('1. initial status');
    });
  });
});
