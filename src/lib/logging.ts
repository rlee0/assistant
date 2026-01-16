/**
 * Production-grade structured logging with environment-based level gating.
 *
 * Features:
 * - Type-safe log levels with runtime validation
 * - Environment-aware configuration (server vs client)
 * - Structured metadata support
 * - Zero-cost abstraction when logs are filtered
 * - ISO 8601 timestamps for observability
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Log levels for structured logging
 */
export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  readonly message: string;
  readonly level: LogLevel;
  readonly timestamp: string;
  readonly error?: string;
  readonly [key: string]: unknown;
}

// ============================================================================
// Constants
// ============================================================================

const LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"] as const;

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Type guard for valid log levels
 */
function isValidLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && LOG_LEVELS.includes(value as LogLevel);
}

/**
 * Safely normalize log level string to enum value
 */
function parseLogLevel(value: string | undefined | null): LogLevel | null {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  return isValidLogLevel(normalized) ? normalized : null;
}

/**
 * Resolve log level from environment with fallback strategy
 */
function resolveLogLevel(): LogLevel {
  // Server-side: check both LOG_LEVEL and NEXT_PUBLIC_LOG_LEVEL
  // Client-side: only NEXT_PUBLIC_LOG_LEVEL is available
  const envLevel =
    typeof window === "undefined"
      ? process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL
      : process.env.NEXT_PUBLIC_LOG_LEVEL;

  const parsed = parseLogLevel(envLevel);
  if (parsed !== null) return parsed;

  // Safe default: verbose in dev, quiet in prod
  return process.env.NODE_ENV === "production" ? "warn" : "debug";
}

/**
 * Determine if a log should be emitted based on configured threshold
 */
function shouldLog(level: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[threshold];
}

// ============================================================================
// Module State
// ============================================================================

const CURRENT_LOG_LEVEL: LogLevel = resolveLogLevel();

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Safely extract error message with stack preservation for observability.
 * Handles Error objects, strings, and arbitrary values gracefully.
 */
function serializeError(error: unknown): string {
  if (error instanceof Error) {
    // Include stack in development for debugging
    if (process.env.NODE_ENV === "development" && error.stack) {
      return error.stack;
    }
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error === null || error === undefined) {
    return String(error);
  }

  // Handle objects with custom toString or toJSON
  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Log an error with structured context.
 *
 * Always emitted unless LOG_LEVEL is set to suppress errors entirely.
 * Includes error serialization with stack traces in development.
 *
 * @param context - Component/module identifier (e.g., "[Auth]", "[API]")
 * @param message - Human-readable description
 * @param error - Error object, string, or arbitrary value
 * @param metadata - Additional structured data for observability
 *
 * @example
 * ```ts
 * try {
 *   await fetchData();
 * } catch (error) {
 *   logError("[API]", "Fetch failed", error, { endpoint: "/api/data" });
 * }
 * ```
 */
export function logError(
  context: string,
  message: string,
  error: unknown,
  metadata?: Readonly<Record<string, unknown>>
): void {
  if (!shouldLog("error", CURRENT_LOG_LEVEL)) return;

  const entry: LogEntry = {
    level: "error",
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    error: serializeError(error),
    ...metadata,
  };

  console.error(entry.message, entry);
}

/**
 * Log a warning about unexpected but recoverable conditions.
 *
 * Use for configuration issues, fallbacks, or deprecated usage.
 *
 * @param context - Component/module identifier
 * @param message - Human-readable description
 * @param metadata - Additional context
 */
export function logWarn(
  context: string,
  message: string,
  metadata?: Readonly<Record<string, unknown>>
): void {
  if (!shouldLog("warn", CURRENT_LOG_LEVEL)) return;

  const entry: LogEntry = {
    level: "warn",
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.warn(entry.message, entry);
}

/**
 * Log informational messages for operational visibility.
 *
 * Use for significant events (startup, shutdown, major state transitions).
 *
 * @param context - Component/module identifier
 * @param message - Human-readable description
 * @param metadata - Additional context
 */
export function logInfo(
  context: string,
  message: string,
  metadata?: Readonly<Record<string, unknown>>
): void {
  if (!shouldLog("info", CURRENT_LOG_LEVEL)) return;

  const entry: LogEntry = {
    level: "info",
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.info(entry.message, entry);
}

/**
 * Log debug information for development troubleshooting.
 *
 * Automatically filtered in production (unless explicitly enabled).
 * Use liberally for state inspection and flow tracking.
 *
 * @param context - Component/module identifier
 * @param message - Human-readable description
 * @param metadata - Additional context
 */
export function logDebug(
  context: string,
  message: string,
  metadata?: Readonly<Record<string, unknown>>
): void {
  if (!shouldLog("debug", CURRENT_LOG_LEVEL)) return;

  const entry: LogEntry = {
    level: "debug",
    message: `${context} ${message}`,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  console.debug(entry.message, entry);
}

// ============================================================================
// Logger Factory
// ============================================================================

/**
 * Context-bound logger interface for ergonomic usage
 */
export interface Logger {
  readonly error: (
    message: string,
    error: unknown,
    metadata?: Readonly<Record<string, unknown>>
  ) => void;
  readonly warn: (message: string, metadata?: Readonly<Record<string, unknown>>) => void;
  readonly info: (message: string, metadata?: Readonly<Record<string, unknown>>) => void;
  readonly debug: (message: string, metadata?: Readonly<Record<string, unknown>>) => void;
}

/**
 * Create a context-bound logger for consistent prefixing.
 *
 * Reduces boilerplate when logging from a single module/component.
 *
 * @param context - Component/module identifier (e.g., "[ChatStore]", "[API]")
 * @returns Immutable logger instance with bound context
 *
 * @example
 * ```ts
 * const logger = createLogger("[UserService]");
 *
 * try {
 *   await updateUser(userId, data);
 *   logger.info("User updated", { userId });
 * } catch (error) {
 *   logger.error("Update failed", error, { userId });
 * }
 * ```
 */
export function createLogger(context: string): Logger {
  return Object.freeze({
    error: (message: string, error: unknown, metadata?: Readonly<Record<string, unknown>>) =>
      logError(context, message, error, metadata),
    warn: (message: string, metadata?: Readonly<Record<string, unknown>>) =>
      logWarn(context, message, metadata),
    info: (message: string, metadata?: Readonly<Record<string, unknown>>) =>
      logInfo(context, message, metadata),
    debug: (message: string, metadata?: Readonly<Record<string, unknown>>) =>
      logDebug(context, message, metadata),
  });
}
