'use client';

import React from 'react';
import Link from 'next/link';
import { isChunkLoadError, tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';
import { reportClientError } from '@/lib/utils/report-client-error';

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isChunk
          ? 'A page update is available. Reloading now…'
          : 'This page hit a problem. The rest of the app is still available.'}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
