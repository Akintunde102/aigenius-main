import { resolveSymbolAnchor } from './symbol-anchor';

const mockSidecarFetch = jest.fn();

jest.mock('../../sidecar-fetch', () => ({
  sidecarFetch: (...args: unknown[]) => mockSidecarFetch(...args),
}));

jest.mock('../../active-code-project', () => ({
  getActiveCodeProjectRootPath: () => '/proj',
  getActiveCodeProjectId: () => 'p1',
  setActiveCodeProjectIndex: jest.fn(),
}));

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe('symbol-anchor', () => {
  beforeEach(() => {
    mockSidecarFetch.mockReset();
  });

  it('resolves line:N via symbol-at-line endpoint', async () => {
    mockSidecarFetch.mockResolvedValueOnce(
      jsonResponse({ name: 'foo', kind: 'function', line_start: 10, line_end: 25 }),
    );

    const r = await resolveSymbolAnchor('/proj/src/a.ts', 'line:15');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.range.line_start).toBe(10);
      expect(r.range.line_end).toBe(25);
    }
    expect(mockSidecarFetch.mock.calls[0][0]).toContain('/search/symbol-at-line');
  });

  it('falls back with fallbackLine when line:N has no symbol', async () => {
    mockSidecarFetch.mockResolvedValueOnce(jsonResponse({}, false));

    const r = await resolveSymbolAnchor('/proj/src/a.ts', 'line:42');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.fallbackLine).toBe(42);
      expect(r.reason).toContain('line 42');
    }
  });

  it('resolves bare symbol name via symbol-line-range', async () => {
    mockSidecarFetch.mockResolvedValueOnce(
      jsonResponse({ name: 'OrdersService', kind: 'class', line_start: 5, line_end: 80 }),
    );

    const r = await resolveSymbolAnchor('/proj/src/orders.ts', 'OrdersService');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.range.name).toBe('OrdersService');
  });

  it('resolves dotted symbol OrdersService.cancelOrder to method name', async () => {
    mockSidecarFetch
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(
        jsonResponse({ name: 'cancelOrder', kind: 'method', line_start: 40, line_end: 55 }),
      );

    const r = await resolveSymbolAnchor('/proj/src/orders.ts', 'OrdersService.cancelOrder');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.range.name).toBe('cancelOrder');
  });

  it('reports ambiguity when multiple symbols match across project (LLM must disambiguate)', async () => {
    mockSidecarFetch
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(
        jsonResponse({
          symbols: [
            { path: '/proj/a.ts', name: 'handle', line_start: 1 },
            { path: '/proj/b.ts', name: 'handle', line_start: 9 },
          ],
        }),
      );

    const r = await resolveSymbolAnchor('/proj/other.ts', 'handle');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toContain('ambiguous');
      expect(r.reason).toContain('/proj/a.ts');
      expect(r.reason).toContain('/proj/b.ts');
    }
  });
});
