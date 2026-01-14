import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/callback
 *
 * OAuth callback handler for Supabase authentication.
 * This route is called by Supabase after the user completes OAuth flow.
 * It exchanges the authorization code for a session.
 *
 * Security:
 * - PKCE (Proof Key for Code Exchange) validation is handled automatically by Supabase SDK
 * - State parameter validation is handled automatically by Supabase SDK
 * - Ensure your Supabase project OAuth settings (Authentication → Providers) are correctly configured
 *
 * @param request The callback request with OAuth code in query params
 * @returns Redirect to home page on success, to login on failure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors from provider
    if (error && typeof error === "string") {
      console.error("[Auth Callback] OAuth error:", {
        error,
        description: errorDescription,
      });
      return NextResponse.redirect(new URL("/login?error=oauth_failed", request.url));
    }

    // Code is required for successful callback
    if (!code || typeof code !== "string") {
      console.error("[Auth Callback] Missing or invalid authorization code");
      return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
    }

    // Create Supabase server client and exchange code for session
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("[Auth Callback] Failed to exchange code for session:", exchangeError);
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }

    // Successfully authenticated, redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("[Auth Callback] Unexpected error:", error);
    return NextResponse.redirect(new URL("/login?error=unexpected", request.url));
  }
}
