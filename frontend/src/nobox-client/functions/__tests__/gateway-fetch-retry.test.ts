import {
  computeGatewayFetchRetryDelayMs,
  fetchGatewayWithRetries,
  isRetryableGatewayHttpStatus,
  isTransientGatewayFetchError,
  shouldRetryGatewayFetch,
} from '../gateway-fetch-retry';

function mockResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: { cancel: jest.fn().mockResolvedValue(undefined) },
  } as unknown as Response;
}

describe('gateway-fetch-retry', () => {
  it('treats network and 5xx failures as retryable', () => {
    expect(isTransientGatewayFetchError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableGatewayHttpStatus(503)).toBe(true);
    expect(shouldRetryGatewayFetch({
      httpStatus: 504,
      attempt: 2,
      maxAttempts: 20,
    })).toBe(true);
  });

  it('does not retry 4xx client errors', () => {
    expect(isRetryableGatewayHttpStatus(401)).toBe(false);
    expect(shouldRetryGatewayFetch({
      httpStatus: 400,
      attempt: 1,
      maxAttempts: 20,
    })).toBe(false);
  });

  it('retries transient fetch failures then returns the successful response', async () => {
    jest.useFakeTimers();
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(mockResponse(200));

    const responsePromise = fetchGatewayWithRetries(fetchFn, { method: 'POST' }, { maxAttempts: 3 });
    await jest.runAllTimersAsync();
    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('retries retryable HTTP statuses', async () => {
    jest.useFakeTimers();
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(mockResponse(502))
      .mockResolvedValueOnce(mockResponse(200));

    const responsePromise = fetchGatewayWithRetries(fetchFn, { method: 'POST' }, { maxAttempts: 3 });
    await jest.runAllTimersAsync();
    const response = await responsePromise;
    expect(response.status).toBe(200);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('caps retry delay', () => {
    expect(computeGatewayFetchRetryDelayMs(99)).toBeLessThanOrEqual(15_000);
  });
});
