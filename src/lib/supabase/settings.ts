import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { Settings } from "@/lib/settings";

/**
 * Load user settings from the database
 *
 * Retrieves the persisted settings object for a given user ID.
 * Only works on the server due to 'server-only' directive.
 *
 * @param userId - The UUID of the authenticated user
 * @returns The parsed Settings object, or null if no settings exist for the user
 * @throws May throw if database query fails
 */
export async function loadSettings(userId: string): Promise<Settings | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.data ?? null;
}
