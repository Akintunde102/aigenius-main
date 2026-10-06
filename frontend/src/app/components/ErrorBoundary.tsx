'use client'

import React from 'react'
import { isChunkLoadError, tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery'
import { explainClientError } from '@/lib/utils/explain-client-error'
import { reportClientError } from '@/lib/utils/report-client-error'

interface ErrorBoundaryState {
    hasError: boolean
    error?: Error
    errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
    children: React.ReactNode
    fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

const DefaultErrorFallback: React.FC<{ error?: Error; resetError: () => void }> = ({
    error,
    resetError,
}) => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
            <div className="mb-4 text-center">
                <h2 className="text-xl font-semibold">Something went wrong</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                    {error && isChunkLoadError(error)
                        ? 'This page failed to load. Reloading usually fixes it after an update.'
                        : error
                          ? explainClientError(error)
                          : 'An unexpected error occurred. Please try again.'}
                </p>
            </div>

            {error && (
                <details className="mb-4 rounded border border-border bg-muted p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                        Error details
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-red-700 dark:text-red-400">{explainClientError(error)}</pre>
                    {process.env.NODE_ENV === 'development' && error.stack && (
                        <pre className="mt-1 text-xs text-muted-foreground">{error.stack}</pre>
                    )}
                </details>
            )}

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={resetError}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Try Again
                </button>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Reload Page
                </button>
            </div>
        </div>
    </div>
)

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error,
        }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        if (tryAutoReloadOnChunkLoadError(error)) {
            return
        }

        this.props.onError?.(error, errorInfo)
        reportClientError(error, 'app', { componentStack: errorInfo.componentStack })

        this.setState({
            error,
            errorInfo,
        })
    }

    resetError = () => {
        this.setState({ hasError: false, error: undefined, errorInfo: undefined })
    }

    render() {
        if (this.state.hasError) {
            const FallbackComponent = this.props.fallback || DefaultErrorFallback
            return (
                <FallbackComponent error={this.state.error} resetError={this.resetError} />
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary 