import { sidecarFetch } from '../sidecar-fetch';

describe('sidecarFetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('applies AbortSignal.timeout when no signal is provided', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock as typeof fetch;

    await sidecarFetch('http://localhost:8001/search/status', { method: 'GET' }, 5000);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8001/search/status',
      expect.objectContaining({
        method: 'GET',
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('maps TimeoutError to a user-facing busy message', async () => {
    const timeoutErr = new Error('The operation was aborted due to timeout');
    timeoutErr.name = 'TimeoutError';
    global.fetch = jest.fn().mockRejectedValue(timeoutErr) as typeof fetch;

    await expect(
      sidecarFetch('http://localhost:8001/search/status', undefined, 1000),
    ).rejects.toThrow('Search service did not respond within 1000ms');
  });
});
