/**
 * Structured error types for chat operations
 * Provides type-safe error handling without relying on error.status or other loose patterns
 */

/**
 * Error thrown when authentication is required
 */
export class AuthenticationError extends Error {
  readonly name = "AuthenticationError";
  readonly statusCode = 401;

  constructor(message: string = "Authentication required") {
    super(message);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when authorization fails
 */
export class AuthorizationError extends Error {
  readonly name = "AuthorizationError";
  readonly statusCode = 403;

  constructor(message: string = "Unauthorized") {
    super(message);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends Error {
  readonly name = "NotFoundError";
  readonly statusCode = 404;

  constructor(message: string = "Not found") {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown on server-side errors
 */
export class ServerError extends Error {
  readonly name = "ServerError";
  readonly statusCode: number;

  constructor(message: string = "Server error", statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Error thrown on network/connectivity issues
 */
export class NetworkError extends Error {
  readonly name = "NetworkError";

  constructor(message: string = "Network error") {
    super(message);
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Error thrown when operation is aborted
 */
export class AbortedError extends Error {
  readonly name = "AbortedError";

  constructor(message: string = "Operation aborted") {
    super(message);
    Object.setPrototypeOf(this, AbortedError.prototype);
  }
}

/**
 * Type guard for authentication errors
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard for authorization errors
 */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/**
 * Type guard for not found errors
 */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/**
 * Type guard for network errors
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard for aborted errors
 */
export function isAbortedError(error: unknown): error is AbortedError {
  if (error instanceof AbortedError) return true;
  if (error instanceof Error && error.name === "AbortError") return true;
  return false;
}

/**
 * Converts HTTP status codes to appropriate error types
 */
export function createErrorFromStatus(
  status: number,
  message: string,
  responseText?: string
): Error {
  const detail = responseText || message;
  switch (status) {
    case 401:
      return new AuthenticationError(detail);
    case 403:
      return new AuthorizationError(detail);
    case 404:
      return new NotFoundError(detail);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(detail, status);
    default:
      return new ServerError(detail, status);
  }
}

/**
 * Extracts user-friendly error message from error objects
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Determines if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (isNetworkError(error)) return true;
  if (isAbortedError(error)) return false;
  if (error instanceof ServerError) {
    return error.statusCode >= 500;
  }
  return false;
}
