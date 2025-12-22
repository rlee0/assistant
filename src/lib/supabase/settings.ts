import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function loadSettings(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("settings")
    .select("data")
    .eq("id", userId)
    .maybeSingle();
  return data?.data ?? null;
}
