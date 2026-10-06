/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render } from '@testing-library/react';
import { ClientErrorTracker } from '../ClientErrorTracker';
import { reportClientError } from '@/lib/utils/report-client-error';
import { tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';

jest.mock('@/lib/utils/report-client-error', () => ({
  reportClientError: jest.fn(),
}));

jest.mock('@/lib/utils/chunk-load-recovery', () => ({
  tryAutoReloadOnChunkLoadError: jest.fn(() => false),
}));

describe('ClientErrorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete window.__aigCrashInstalled;
  });

  it('reports window errors and unhandled rejections', () => {
    render(<ClientErrorTracker />);

    const error = new Error('handler failed');
    window.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
    const reason = new Error('promise failed');
    const rejection = new Event('unhandledrejection');
    Object.defineProperty(rejection, 'reason', { value: reason });
    Object.defineProperty(rejection, 'promise', { value: Promise.resolve() });
    window.dispatchEvent(rejection);

    expect(reportClientError).toHaveBeenCalledWith(error, 'window.onerror');
    expect(reportClientError).toHaveBeenCalledWith(reason, 'unhandledrejection');
  });

  it('ignores resource load errors and reloads stale chunks without reporting', () => {
    (tryAutoReloadOnChunkLoadError as jest.Mock).mockReturnValue(true);
    render(<ClientErrorTracker />);

    const resourceError = new Event('error');
    Object.defineProperty(resourceError, 'target', { value: document.createElement('img') });
    window.dispatchEvent(resourceError);

    const chunk = new Error('Loading chunk 4 failed');
    window.dispatchEvent(new ErrorEvent('error', { error: chunk, message: chunk.message }));

    expect(reportClientError).not.toHaveBeenCalled();
  });

  it('removes listeners on unmount', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const { unmount } = render(<ClientErrorTracker />);

    const errorHandler = add.mock.calls.find((call) => call[0] === 'error')?.[1];
    const rejectionHandler = add.mock.calls.find((call) => call[0] === 'unhandledrejection')?.[1];
    unmount();

    expect(remove).toHaveBeenCalledWith('error', errorHandler);
    expect(remove).toHaveBeenCalledWith('unhandledrejection', rejectionHandler);
    add.mockRestore();
    remove.mockRestore();
  });

  it('leaves window errors to the early beacon once that script is installed', () => {
    window.__aigCrashInstalled = true;
    render(<ClientErrorTracker />);

    window.dispatchEvent(new ErrorEvent('error', {
      error: new Error('already covered'),
      message: 'already covered',
    }));

    expect(reportClientError).not.toHaveBeenCalled();
    delete window.__aigCrashInstalled;
  });
});
