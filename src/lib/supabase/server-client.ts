import { cookies } from "next/headers";
import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { CookieOptions, SetAllCookies } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase environment variables are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

function normalizeCookieOptions(options?: CookieOptions) {
  if (!options) {
    return undefined;
  }

  const { domain, path, secure, sameSite, partitioned, httpOnly, maxAge, priority, expires } =
    options;

  return { domain, path, secure, sameSite, partitioned, httpOnly, maxAge, priority, expires };
}

export async function createSupabaseServerClient(options?: { allowCookieWrite?: boolean }) {
  const cookieStore = await cookies();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase client unavailable: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const cookieMethods = {
    async getAll() {
      return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
    },
    async setAll(toSet: Parameters<SetAllCookies>[0]) {
      // Next.js restricts cookie modifications to Route Handlers or Server Actions
      if (options?.allowCookieWrite) {
        for (const { name, value, options: opts } of toSet) {
          cookieStore.set(name, value, normalizeCookieOptions(opts));
        }
      }
    },
  };

  return createServerClient(supabaseUrl, supabaseAnonKey, { cookies: cookieMethods });
}
