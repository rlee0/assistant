import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Proxy for authentication and authorization checks
 *
 * This proxy:
 * - Refreshes Supabase auth session from cookies
 * - Redirects unauthenticated users to signup
 * - Protects private routes (currently root page /)
 * - Allows auth routes (/(auth)) for all users
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow auth routes for everyone (including unauthenticated users)
  if (pathname.startsWith("/(auth)") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // For protected routes, check authentication
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users to signup
    if (!user && pathname !== "/") {
      return NextResponse.redirect(new URL("/(auth)/signup", request.url));
    }

    if (!user && pathname === "/") {
      return NextResponse.redirect(new URL("/(auth)/signup", request.url));
    }

    // User is authenticated, proceed
    return NextResponse.next();
  } catch (error) {
    // Supabase not configured, allow request to proceed (page will show config error)
    console.error("[Proxy] Auth check failed:", error);
    return NextResponse.next();
  }
}

/**
 * Configure which routes use proxy
 */
export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
