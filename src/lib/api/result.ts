/**
 * Result type for explicit error handling
 * Replaces the mixed return type pattern (T | NextResponse)
 */

import { NextResponse } from "next/server";

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string; statusCode: number };

/**
 * Create a success result
 */
export function Ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function Err(error: string, code: string, statusCode: number = 400): Result<never> {
  return { success: false, error, code, statusCode };
}

/**
 * Convert a Result to a NextResponse
 */
export function resultToResponse<T>(result: Result<T>): NextResponse {
  if (result.success) {
    return NextResponse.json({ data: result.data });
  }

  return NextResponse.json(
    {
      error: result.error,
      code: result.code,
    },
    { status: result.statusCode }
  );
}

/**
 * Execute an async function and catch errors as Results
 */
export async function tryAsync<T>(
  fn: () => Promise<T>,
  errorCode: string,
  statusCode: number = 500
): Promise<Result<T>> {
  try {
    const data = await fn();
    return Ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return Err(message, errorCode, statusCode);
  }
}
