import { APIError, ErrorCodes, authenticationError, handleAPIError } from "@/lib/api/errors";
import { logDebug, logError } from "@/lib/logging";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * POST /api/account/delete - Delete user account and all associated data
 *
 * Security:
 * - Requires authenticated user session
 * - Uses database function with SECURITY DEFINER to delete user
 * - Data cleanup handled automatically via CASCADE DELETE constraints
 * - Structured logging prevents credential leakage
 *
 * @returns 200 on success, 401 if unauthenticated, 500 on deletion error
 */
export async function POST() {
  const isDevelopment = process.env.NODE_ENV === "development";
  const requestId = crypto.randomUUID();

  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logError(
        "[Account Delete]",
        "Unauthorized deletion attempt",
        authError ?? new Error("No user found"),
        { requestId }
      );
      return authenticationError();
    }

    if (isDevelopment) {
      logDebug("[Account Delete]", "Attempting user deletion", { requestId, userId: user.id });
    }

    // Call the database function to delete the user account
    // This function uses SECURITY DEFINER to delete from auth.users
    // CASCADE DELETE will automatically remove all related data
    const { error: deleteError } = await supabase.rpc("delete_own_account");

    if (deleteError) {
      logError("[Account Delete]", "Supabase deletion failed", deleteError, {
        requestId,
        userId: user.id,
        code: deleteError.code,
      });
      throw new APIError(
        "Failed to delete account. Please try again.",
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    if (isDevelopment) {
      logDebug("[Account Delete]", "User deletion successful", { requestId, userId: user.id });
    }

    // Sign out the user after successful deletion
    await supabase.auth.signOut();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleAPIError(error, { requestId, isDevelopment });
  }
}
