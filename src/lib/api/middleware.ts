import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type AuthenticatedRequest = NextRequest & { userId?: string };

/**
 * Middleware to authenticate requests using Supabase
 * Returns user ID if authenticated, otherwise returns error response
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return { userId: user.id };
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

/**
 * Safely parse request JSON body
 */
export async function parseRequestBody(request: NextRequest): Promise<unknown | NextResponse> {
  try {
    return await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }
}
