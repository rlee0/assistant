import { authenticationError, handleAPIError } from "@/lib/api/errors";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * POST /api/auth/logout
 *
 * Sign out the authenticated user and clear their session.
 *
 * Currently accepts no request body.
 * If parameters are added in future, add validation via parseRequestBody middleware.
 *
 * @requires Authentication via session cookie
 * @returns JSON with success status
 * @throws 401 if user is not authenticated
 * @throws 500 if logout fails
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleAPIError(error);
  }
}
