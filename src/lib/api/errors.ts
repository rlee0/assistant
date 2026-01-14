import { NextResponse } from "next/server";

export class APIError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "APIError";
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

interface ErrorResponse {
  error: string;
  code: ErrorCode;
  requestId?: string;
}

/**
 * Format error for logging (safe for production)
 */
function formatErrorForLogging(error: unknown, isDevelopment: boolean): string {
  if (error instanceof APIError) {
    return `[${error.code}] ${error.message}${
      isDevelopment && error.cause ? ` - ${error.cause.message}` : ""
    }`;
  }
  if (error instanceof Error) {
    return isDevelopment ? error.message : "An unexpected error occurred";
  }
  return "Unknown error";
}

/**
 * Handle API errors and return appropriate response
 */
export function handleAPIError(
  error: unknown,
  options?: { requestId?: string; isDevelopment?: boolean }
): NextResponse {
  const isDevelopment = options?.isDevelopment ?? process.env.NODE_ENV === "development";
  const requestId = options?.requestId;

  // Log with appropriate detail level
  console.error(`[API Error]${requestId ? ` [${requestId}]` : ""}:`, {
    message: formatErrorForLogging(error, isDevelopment),
    ...(isDevelopment && error instanceof Error && { stack: error.stack }),
  });

  if (error instanceof APIError) {
    const code: ErrorCode = (error.code as ErrorCode) ?? ErrorCodes.INTERNAL_ERROR;
    const response: ErrorResponse = {
      error: error.message,
      code,
      ...(requestId && { requestId }),
    };
    return NextResponse.json(response, { status: error.statusCode });
  }

  if (error instanceof Error) {
    const message = isDevelopment ? error.message : "An unexpected error occurred";
    const response: ErrorResponse = {
      error: message,
      code: ErrorCodes.INTERNAL_ERROR,
      ...(requestId && { requestId }),
    };
    return NextResponse.json(response, { status: 500 });
  }

  const response: ErrorResponse = {
    error: "An unexpected error occurred",
    code: ErrorCodes.INTERNAL_ERROR,
    ...(requestId && { requestId }),
  };
  return NextResponse.json(response, { status: 500 });
}

/**
 * Create validation error response
 */
export function validationError(message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.VALIDATION_ERROR,
    } as ErrorResponse,
    { status: 400 }
  );
}

/**
 * Create authentication error response
 */
export function authenticationError(): NextResponse {
  return NextResponse.json(
    {
      error: "Unauthorized",
      code: ErrorCodes.AUTHENTICATION_ERROR,
    } as ErrorResponse,
    { status: 401 }
  );
}

/**
 * Create authorization error response
 */
export function authorizationError(): NextResponse {
  return NextResponse.json(
    {
      error: "Forbidden",
      code: ErrorCodes.AUTHORIZATION_ERROR,
    } as ErrorResponse,
    { status: 403 }
  );
}

/**
 * Create not found error response
 */
export function notFoundError(resource: string): NextResponse {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      code: ErrorCodes.NOT_FOUND,
    } as ErrorResponse,
    { status: 404 }
  );
}

/**
 * Create conflict error response
 */
export function conflictError(message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.CONFLICT,
    } as ErrorResponse,
    { status: 409 }
  );
}
