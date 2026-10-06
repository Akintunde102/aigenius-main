'use client';

import React from 'react';
import { tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery';
import { reportClientError } from '@/lib/utils/report-client-error';

type RenderErrorBoundaryProps = {
  children: React.ReactNode;
  /** Shown in place of the children when they throw while rendering. */
  message?: string;
  /** Prefix for the console line, so production logs name the surface that failed. */
  logLabel?: string;
  /** Clears a previous failure when the value changes, so streaming content can recover. */
  resetKey?: string | number;
  /** Replaces the default alert. Use this when the raw content should still be visible. */
  fallback?: React.ReactNode;
  /** Shows a Try again button and a larger in-place card. */
  recoverable?: boolean;
  className?: string;
};

type RenderErrorBoundaryState = {
  failed: boolean;
};

/**
 * Keeps a render failure inside the widget that threw.
 * The rest of the page stays mounted.
 */
export class RenderErrorBoundary extends React.Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (tryAutoReloadOnChunkLoadError(error)) {
      return;
    }
    reportClientError(error, this.props.logLabel ?? 'render', {
      componentStack: info.componentStack,
    });
  }

  componentDidUpdate(prevProps: RenderErrorBoundaryProps): void {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  reset = (): void => {
    this.setState({ failed: false });
  };

  render(): React.ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    const message = this.props.message ?? 'Could not show this result.';
    if (!this.props.recoverable) {
      return (
        <p className="text-[11px] text-red-700 dark:text-red-400" role="alert">
          {message}
        </p>
      );
    }

    return (
      <div
        role="alert"
        className={
          this.props.className
          ?? 'flex min-h-[12rem] w-full flex-col items-center justify-center gap-3 px-4 py-6 text-center'
        }
      >
        <p className="max-w-sm text-sm text-foreground">{message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
        >
          Try again
        </button>
      </div>
    );
  }
}
