import { APIError, ErrorCodes, handleAPIError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Type-safe result types for API operations
 */
export type Result<T, E = APIError> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Helper to create success result
 */
export const success = <T>(value: T): Result<T> => ({
  ok: true,
  value,
});

/**
 * Helper to create error result
 */
export const failure = <E>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
}

/**
 * Middleware to authenticate requests using Supabase
 * Returns user ID if authenticated, otherwise returns APIError
 *
 * @throws Does not throw; returns Result type
 */
export async function authenticateRequest(): Promise<Result<string, APIError>> {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return failure(
        new APIError("Unauthorized: User not authenticated", 401, ErrorCodes.AUTHENTICATION_ERROR)
      );
    }

    return success(user.id);
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return failure(
      new APIError("Authentication failed", 401, ErrorCodes.AUTHENTICATION_ERROR, cause)
    );
  }
}

/**
 * Safely parse request JSON body with type safety
 * Returns parsed object or validation error
 */
export async function parseRequestBody<T = unknown>(
  request: NextRequest
): Promise<Result<T, APIError>> {
  try {
    const body = await request.json();
    return success(body as T);
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return failure(
      new APIError("Invalid JSON in request body", 400, ErrorCodes.VALIDATION_ERROR, cause)
    );
  }
}

/**
 * Convert Result to NextResponse for API handlers
 * Automatically handles error responses
 */
export function resultToResponse<T>(
  result: Result<T>,
  onSuccess: (value: T) => NextResponse | Promise<NextResponse>,
  isDevelopment?: boolean
): NextResponse | Promise<NextResponse> {
  if (result.ok) {
    return onSuccess(result.value);
  }

  return handleAPIError(result.error, { isDevelopment });
}
