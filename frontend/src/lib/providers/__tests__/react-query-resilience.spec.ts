import {
  readHttpStatus,
  shouldReportQueryError,
  shouldRetryFailedRequest,
} from '@/lib/providers/react-query-resilience';

describe('react-query resilience', () => {
  it('reads status from axios-shaped and flat errors', () => {
    expect(readHttpStatus({ response: { status: 404 } })).toBe(404);
    expect(readHttpStatus({ status: 401 })).toBe(401);
    expect(readHttpStatus(new Error('network'))).toBeUndefined();
    expect(readHttpStatus(null)).toBeUndefined();
  });

  it('stops retrying auth and missing-route failures', () => {
    expect(shouldRetryFailedRequest(0, { response: { status: 401 } })).toBe(false);
    expect(shouldRetryFailedRequest(0, { status: 403 })).toBe(false);
    expect(shouldRetryFailedRequest(0, { statusCode: 404 })).toBe(false);
  });

  it('retries other failures up to three attempts', () => {
    const network = new Error('failed to fetch');
    expect(shouldRetryFailedRequest(0, network)).toBe(true);
    expect(shouldRetryFailedRequest(2, network)).toBe(true);
    expect(shouldRetryFailedRequest(3, network)).toBe(false);
    expect(shouldRetryFailedRequest(0, { response: { status: 500 } })).toBe(true);
  });

  it('skips reporting for silent, cancelled, and expected HTTP statuses', () => {
    expect(shouldReportQueryError(new Error('nope'), { silent: true })).toBe(false);
    expect(shouldReportQueryError({ name: 'CancelledError', message: 'aborted' })).toBe(false);
    expect(shouldReportQueryError({ name: 'AbortError' })).toBe(false);
    expect(shouldReportQueryError({ response: { status: 401 } })).toBe(false);
    expect(shouldReportQueryError({ response: { status: 404 } })).toBe(false);
  });

  it('reports unexpected query failures', () => {
    expect(shouldReportQueryError(new Error('timeout'))).toBe(true);
    expect(shouldReportQueryError({ response: { status: 500 } }, { silent: false })).toBe(true);
  });
});
