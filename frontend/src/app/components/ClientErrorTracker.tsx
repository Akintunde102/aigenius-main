'use client';

import { useEffect } from 'react';
import { tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';
import { reportClientError } from '@/lib/utils/report-client-error';

/**
 * Catches failures React error boundaries never see:
 * event handlers, timers, and rejected promises.
 */
export function ClientErrorTracker() {
  useEffect(() => {
    const onError = (event: Event) => {
      if (event.target && event.target !== window) {
        return;
      }
      const errorEvent = event as ErrorEvent;
      const error = errorEvent.error ?? errorEvent.message;
      if (tryAutoReloadOnChunkLoadError(error)) {
        return;
      }
      errorEvent.preventDefault();
      if (window.__aigCrashInstalled) {
        return;
      }
      reportClientError(error, 'window.onerror');
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (tryAutoReloadOnChunkLoadError(event.reason)) {
        return;
      }
      event.preventDefault();
      if (window.__aigCrashInstalled) {
        return;
      }
      reportClientError(event.reason, 'unhandledrejection');
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
