import { APIError, authenticationError, handleAPIError } from "@/lib/api/errors";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      throw new APIError("Service configuration error", 500);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.auth.admin.deleteUser(user.id);

    if (error) {
      throw new APIError("Failed to delete account", 400);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleAPIError(error);
  }
}
