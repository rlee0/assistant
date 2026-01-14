import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = new Set(["/login", "/signup", "/api/auth/callback"]);

/**
 * Check if a route is public and doesn't require authentication
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

/**
 * Middleware for authentication and authorization
 *
 * Responsibilities:
 * - Validates and refreshes Supabase auth sessions
 * - Redirects unauthenticated users to login
 * - Protects private routes
 * - Allows public routes (auth pages, callbacks)
 *
 * @param request - The incoming request
 * @returns NextResponse to continue or redirect
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Allow public routes without authentication
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check authentication for protected routes
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Handle auth errors
    if (error) {
      console.error("[Middleware] Auth verification failed:", error.message);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Redirect unauthenticated users
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // User authenticated, proceed with request
    return NextResponse.next();
  } catch (error) {
    // Log configuration errors but allow request (page will handle)
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Middleware] Auth check failed:", message);
    return NextResponse.next();
  }
}

/**
 * Configure which routes use the proxy middleware
 */
export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg).*)",
  ],
};
