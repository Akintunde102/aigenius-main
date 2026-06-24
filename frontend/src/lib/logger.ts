type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
    userId?: string
    sessionId?: string
    feature?: string
    action?: string
    metadata?: Record<string, unknown>
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development'
    private isServer = typeof window === 'undefined'

    private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString()
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`

        if (context) {
            const contextStr = Object.entries(context)
                .filter(([, value]) => value !== undefined)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(' ')

            return `${prefix} ${message} {${contextStr}}`
        }

        return `${prefix} ${message}`
    }

    private shouldLog(level: LogLevel): boolean {
        if (this.isDevelopment) return true

        // In production, only log warnings and errors
        return level === 'warn' || level === 'error'
    }

    private logToConsole(level: LogLevel, message: string, context?: LogContext, data?: unknown) {
        if (!this.shouldLog(level)) return

        const formattedMessage = this.formatMessage(level, message, context)

        switch (level) {
            case 'debug':
                console.debug(formattedMessage, data)
                break
            case 'info':
                console.info(formattedMessage, data)
                break
            case 'warn':
                console.warn(formattedMessage, data)
                break
            case 'error':
                console.error(formattedMessage, data)
                break
        }
    }

    private logToService(level: LogLevel, message: string, context?: LogContext, data?: unknown) {
        // In production, send logs to external service (e.g., Sentry, LogRocket, etc.)
        if (this.isDevelopment || this.isServer) return

        // Example: Send to monitoring service
        // This would be replaced with actual service integration
        if (level === 'error') {
            // Sentry.captureException(new Error(message), { contexts: { custom: context }, extra: data })
        }
    }

    debug(message: string, context?: LogContext, data?: unknown) {
        this.logToConsole('debug', message, context, data)
    }

    info(message: string, context?: LogContext, data?: unknown) {
        this.logToConsole('info', message, context, data)
        this.logToService('info', message, context, data)
    }

    warn(message: string, context?: LogContext, data?: unknown) {
        this.logToConsole('warn', message, context, data)
        this.logToService('warn', message, context, data)
    }

    error(message: string, context?: LogContext, data?: unknown) {
        this.logToConsole('error', message, context, data)
        this.logToService('error', message, context, data)
    }

    // Convenience methods for specific scenarios
    apiCall(method: string, url: string, status: number, duration: number) {
        this.info('API call completed', {
            feature: 'api',
            action: 'request',
            metadata: { method, url, status, duration }
        })
    }

    userAction(action: string, feature: string, userId?: string, metadata?: Record<string, unknown>) {
        this.info('User action', {
            userId,
            feature,
            action,
            metadata
        })
    }

    performanceMetric(metric: string, value: number, context?: LogContext) {
        this.info('Performance metric', {
            ...context,
            feature: 'performance',
            action: 'metric',
            metadata: { metric, value }
        })
    }
}

// Create singleton instance
export const logger = new Logger()

// Export helper for structured error logging
export const logError = (error: Error, context?: LogContext) => {
    logger.error(error.message, {
        ...context,
        metadata: {
            ...context?.metadata,
            stack: error.stack,
            name: error.name,
        }
    })
}

// Export helper for API errors
export const logApiError = (error: unknown, endpoint: string, method: string) => {
    const message = error instanceof Error ? error.message : 'Unknown API error'
    logger.error(message, {
        feature: 'api',
        action: 'error',
        metadata: { endpoint, method, error: String(error) }
    })
}

export default logger 