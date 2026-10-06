'use client';

import React from 'react';
import { tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (tryAutoReloadOnChunkLoadError(error)) {
      return;
    }
    void import('@/lib/utils/report-client-error')
      .then(({ reportClientError }) => {
        reportClientError(error, 'global-error', { digest: error.digest });
      })
      .catch(() => {
        console.error('[global-error]', error);
      });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: '#0f0f0f',
          color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1rem',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#a1a1aa', maxWidth: '28rem', margin: 0 }}>
            A critical error occurred. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.625rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#fff',
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
