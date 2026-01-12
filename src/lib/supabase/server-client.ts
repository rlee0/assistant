import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Validate Supabase configuration at module load time
 */
function validateSupabaseConfig(): { url: string; key: string } {
  const url = supabaseUrl?.trim();
  const key = supabaseAnonKey?.trim();

  if (!url) {
    throw new Error(
      "Supabase configuration error: NEXT_PUBLIC_SUPABASE_URL is not set. " +
        "Please set this environment variable to your Supabase project URL."
    );
  }

  if (!key) {
    throw new Error(
      "Supabase configuration error: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
        "Please set this environment variable to your Supabase anonymous key."
    );
  }

  return { url, key };
}

interface CreateClientOptions {
  allowCookieWrite?: boolean;
}

/**
 * Create a Supabase server client with proper error handling
 *
 * This function must be called in a Server Component or Route Handler
 * where cookies are available. It validates configuration at runtime
 * and throws if required environment variables are missing.
 *
 * @param options Configuration options
 * @throws If NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing
 * @returns Configured Supabase client
 */
export async function createSupabaseServerClient(options?: CreateClientOptions) {
  const { url, key } = validateSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Next.js restricts cookie modifications to Route Handlers or Server Actions
        if (options?.allowCookieWrite) {
          try {
            cookiesToSet.forEach(({ name, value, options: opts }) => {
              cookieStore.set(name, value, opts);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This is expected and can be ignored if middleware refreshes user sessions.
            if (process.env.NODE_ENV === "development") {
              console.debug(
                "[Supabase] Cookie write attempted in Server Component context (expected behavior)"
              );
            }
          }
        }
      },
    },
  });
}
