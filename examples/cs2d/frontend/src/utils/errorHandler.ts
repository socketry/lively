// TODO: Update for React instead of Vue
// import type { App } from 'vue'

export interface ErrorInfo {
  message: string
  stack?: string
  timestamp: Date
  url: string
  userAgent: string
}

// Global error storage
const errors: ErrorInfo[] = []

// Error logging function
function logError(error: Error | string, context?: string) {
  const errorInfo: ErrorInfo = {
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'object' ? error.stack : undefined,
    timestamp: new Date(),
    url: window.location.href,
    userAgent: navigator.userAgent
  }

  errors.push(errorInfo)

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, errorInfo)
  }

  // In production, you might want to send to error tracking service
  // Example: sendToErrorService(errorInfo)
}

// Setup global error handlers
export function setupErrorHandler(_app?: unknown) {
  // TODO: Replace Vue error handler with React error boundary pattern
  // app.config.errorHandler = (err: Error, _instance: unknown, info: string) => {
  //   logError(err as Error, `Vue Error - ${info}`)
  // }

  // Global unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError(event.reason, 'Unhandled Promise Rejection')
    event.preventDefault() // Prevent console error
  })

  // Global error handler
  window.addEventListener('error', (event) => {
    logError(event.error || event.message, 'Global Error')
  })

  // WebSocket error handler
  window.addEventListener('ws-error', (event: CustomEvent) => {
    logError(event.detail, 'WebSocket Error')
  })
}

// Get error history (for debugging)
export function getErrorHistory(): ErrorInfo[] {
  return [...errors]
}

// Clear error history
export function clearErrorHistory(): void {
  errors.length = 0
}
