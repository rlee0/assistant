import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  passwordChangeSchema,
  type PasswordChangeResponse,
  type ApiErrorResponse,
} from "@/lib/settings/schema";
import { logError } from "@/lib/logging";

/**
 * POST /api/settings/password
 *
 * Changes the authenticated user's password.
 * Requires current password verification.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json<ApiErrorResponse>({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = passwordChangeSchema.parse(body);

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: validatedData.currentPassword,
    });

    if (signInError) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: validatedData.newPassword,
    });

    if (updateError) {
      logError("API", "Error updating password", updateError);
      return NextResponse.json<ApiErrorResponse>(
        { error: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json<PasswordChangeResponse>({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    logError("API", "Error in POST /api/settings/password", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid request data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
