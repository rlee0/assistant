import { APIError, ErrorCodes, authenticationError, handleAPIError } from "@/lib/api/errors";
import { logDebug, logError } from "@/lib/logging";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * POST /api/account/delete - Delete user account and all associated data
 *
 * Security:
 * - Requires authenticated user session
 * - Uses service role key for admin operations (never exposed to client)
 * - Validates environment configuration before proceeding
 * - Structured logging prevents credential leakage
 *
 * @returns 200 on success, 401 if unauthenticated, 500 on configuration or deletion error
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

    // Validate service role configuration (required for user deletion)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      logError(
        "[Account Delete]",
        "Service role configuration missing",
        new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL"),
        { requestId, userId: user.id }
      );
      throw new APIError(
        "Account deletion is temporarily unavailable",
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    if (isDevelopment) {
      logDebug("[Account Delete]", "Attempting user deletion", { requestId, userId: user.id });
    }

    // Create admin client and delete user
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

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

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    // Ensure service role key is never logged
    const sanitizedError =
      error instanceof Error
        ? new Error(error.message.replace(/service_role=[^\s&]+/gi, "service_role=***"))
        : error;

    return handleAPIError(sanitizedError, { requestId, isDevelopment });
  }
}
