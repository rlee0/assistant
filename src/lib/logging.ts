/**
 * Logging Utilities
 *
 * Typed utility functions for structured error and debug logging.
 */

/**
 * Log levels for structured logging
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Structured log entry
 */
interface LogEntry {
  readonly message: string;
  readonly error?: unknown;
  readonly timestamp: string;
  readonly [key: string]: unknown;
}

/**
 * Safely extracts error message from unknown error type
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

/**
 * Logs a structured error message to console
 *
 * @param context - Context/component name (e.g., "[Chat]", "[Auth]")
 * @param message - Human-readable error description
 * @param error - The error object or value
 * @param metadata - Additional structured data to log
 *
 * @example
 * ```ts
 * try {
 *   await navigator.clipboard.writeText(text);
 * } catch (error) {
 *   logError("[Chat]", "Clipboard write failed", error, { textLength: text.length });
 * }
 * ```
 */
export function logError(
  context: string,
  message: string,
  error: unknown,
  metadata?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    message: `${context} ${message}`,
    error: getErrorMessage(error),
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.error(entry.message, entry);
}

/**
 * Logs a structured warning message to console
 */
export function logWarn(
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.warn(entry.message, entry);
}

/**
 * Logs a structured debug message to console
 */
export function logDebug(
  context: string,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const entry: LogEntry = {
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.debug(entry.message, entry);
}
