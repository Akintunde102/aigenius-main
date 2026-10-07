'use client';

import React from 'react';
import Link from 'next/link';
import { isChunkLoadError, tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';
import { reportClientError } from '@/lib/utils/report-client-error';
import { DISPLAY } from '@/app/components/landing/typography';

export function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk = isChunkLoadError(error);

  React.useEffect(() => {
    if (tryAutoReloadOnChunkLoadError(error)) {
      return;
    }
    reportClientError(error, 'route-error', { digest: error.digest });
  }, [error]);

  return (
    <div
      className="landing flex min-h-[60vh] flex-col items-center justify-center p-8"
      style={{ backgroundColor: 'var(--lp-bg)', color: 'var(--lp-fg)' }}
    >
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'var(--lp-surface)', border: '1px solid var(--lp-line)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--lp-accent)' }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </div>

        <div className="space-y-3">
          <h2 className={`${DISPLAY} text-3xl font-semibold tracking-tight lg:text-4xl`}>
            Something went wrong
          </h2>
          <p className="text-[17px] leading-relaxed" style={{ color: 'var(--lp-muted)' }}>
            {isChunk
              ? 'A page update is available. Reloading now…'
              : 'This page hit a problem. The rest of the app is still available.'}
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:gap-4 mt-2">
          <button
            type="button"
            onClick={reset}
            className="flex h-12 w-full items-center justify-center whitespace-nowrap rounded-full px-8 text-[15px] font-medium transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-85 active:scale-[0.97] sm:w-auto"
            style={{ backgroundColor: 'var(--lp-fg)', color: 'var(--lp-bg)' }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="group relative flex h-12 w-full items-center justify-center whitespace-nowrap rounded-full px-8 text-[15px] font-medium transition-transform duration-150 ease-out-strong active:scale-[0.97] sm:w-auto"
            style={{ color: 'var(--lp-fg)' }}
          >
            <span
              className="absolute inset-0 rounded-full border transition-colors duration-150"
              style={{ borderColor: 'var(--lp-line)' }}
            />
            <span
              className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              style={{ backgroundColor: 'var(--lp-tint)' }}
            />
            <span className="relative z-10">Go home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
