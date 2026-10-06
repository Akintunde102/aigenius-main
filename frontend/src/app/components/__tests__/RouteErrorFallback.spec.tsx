/**
 * @jest-environment jsdom
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RouteErrorFallback } from '../RouteErrorFallback';
import { tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';
import { reportClientError } from '@/lib/utils/report-client-error';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock('@/lib/utils/chunk-load-recovery', () => ({
  isChunkLoadError: (error: Error) => error.name === 'ChunkLoadError',
  tryAutoReloadOnChunkLoadError: jest.fn(() => false),
}));

jest.mock('@/lib/utils/report-client-error', () => ({
  reportClientError: jest.fn(),
}));

describe('RouteErrorFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers retry and home for an unexpected page error', () => {
    const reset = jest.fn();
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' });

    render(<RouteErrorFallback error={error} reset={reset} />);

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(reportClientError).toHaveBeenCalledWith(error, 'route-error', { digest: 'digest-1' });
  });

  it('reloads once for a stale chunk and skips the exception report', () => {
    (tryAutoReloadOnChunkLoadError as jest.Mock).mockReturnValue(true);
    const error = new Error('Loading chunk 12 failed');
    error.name = 'ChunkLoadError';

    render(<RouteErrorFallback error={error} reset={jest.fn()} />);

    expect(screen.getByText(/Reloading now/)).toBeInTheDocument();
    expect(reportClientError).not.toHaveBeenCalled();
  });
});
