/** @jest-environment jsdom */

import { getPostHogClient } from '@/lib/analytics/posthog-client';
import {
  reportClientError,
  resetClientErrorReportsForTests,
} from '@/lib/utils/report-client-error';

jest.mock('@/lib/analytics/posthog-client', () => ({
  getPostHogClient: jest.fn(),
}));

const getPostHogClientMock = getPostHogClient as jest.MockedFunction<typeof getPostHogClient>;

describe('reportClientError', () => {
  const capture = jest.fn();
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    resetClientErrorReportsForTests();
    capture.mockReset();
    getPostHogClientMock.mockReturnValue({ capture } as never);
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('sends a truncated exception without attaching extra payloads', () => {
    reportClientError(new Error('render failed'), 'chat-message', {
      componentStack: '\n    at ChatMessage',
      digest: 'abc',
    });

    expect(capture).toHaveBeenCalledWith('$exception', {
      $exception_message: 'render failed',
      $exception_type: 'Error',
      $exception_stack_trace_raw: expect.any(String),
      source: 'chat-message',
      component_stack: '\n    at ChatMessage',
      digest: 'abc',
    });
  });

  it('dedupes the same failure inside the reporting window', () => {
    reportClientError(new Error('same'), 'window.onerror');
    reportClientError(new Error('same'), 'window.onerror');

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('dedupes the same message across different sources', () => {
    reportClientError(new Error('same'), 'window.onerror');
    reportClientError(new Error('same'), 'render');

    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('still logs when analytics is off', () => {
    getPostHogClientMock.mockReturnValue(null);

    reportClientError('plain failure', 'route-error');

    expect(capture).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });

  it('uses the early crash beacon and skips the browser PostHog call', () => {
    const beacon = jest.fn();
    window.__aigReportCrash = beacon;

    reportClientError(new Error('boom https://app.test/chat?token=secret'), 'render');

    expect(beacon).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Error',
      message: 'boom https://app.test/chat',
      source: 'render',
    }));
    expect(capture).not.toHaveBeenCalled();
    delete window.__aigReportCrash;
  });
});
