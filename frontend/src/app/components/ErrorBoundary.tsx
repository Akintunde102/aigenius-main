'use client'

import React from 'react'
import { isChunkLoadError, tryAutoReloadOnChunkLoadError } from '@/lib/utils/chunk-load-recovery'

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
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <svg
                        className="h-6 w-6 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                    </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Something went wrong</h2>
                <p className="mt-2 text-sm text-gray-600">
                    {error && isChunkLoadError(error)
                        ? 'This page failed to load. Reloading usually fixes it after an update.'
                        : "We're sorry, but an unexpected error occurred. Please try again."}
                </p>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
                <details className="mb-4 rounded border bg-gray-50 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Error Details
                    </summary>
                    <pre className="mt-2 text-xs text-red-600">{error.message}</pre>
                    {error.stack && (
                        <pre className="mt-1 text-xs text-gray-500">{error.stack}</pre>
                    )}
                </details>
            )}

            <div className="flex gap-3">
                <button
                    onClick={resetError}
                    className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                    Try Again
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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

        // Log error to monitoring service
        this.props.onError?.(error, errorInfo)

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            // ErrorBoundary caught an error
        }

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