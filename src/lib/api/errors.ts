import { NextResponse } from "next/server";

export class APIError extends Error {
  constructor(message: string, public statusCode: number = 400, public code?: string) {
    super(message);
    this.name = "APIError";
  }
}

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

/**
 * Handle API errors and return appropriate response
 */
export function handleAPIError(error: unknown): NextResponse {
  console.error("API Error:", error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.code && { code: error.code }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // Don't expose internal error details in production
    const message =
      process.env.NODE_ENV === "development" ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        error: message,
        code: ErrorCodes.INTERNAL_ERROR,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: "An unexpected error occurred",
      code: ErrorCodes.INTERNAL_ERROR,
    },
    { status: 500 }
  );
}

/**
 * Create validation error response
 */
export function validationError(message: string): NextResponse {
  return NextResponse.json(
    {
      error: message,
      code: ErrorCodes.VALIDATION_ERROR,
    },
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
    },
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
    },
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
    },
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
    },
    { status: 409 }
  );
}
