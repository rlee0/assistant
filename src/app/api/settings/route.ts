import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  settingsSchema,
  defaultSettings,
  accountInfoSchema,
  type Settings,
  type SettingsApiResponse,
  type SettingsUpdateResponse,
  type ApiErrorResponse,
} from "@/lib/settings/schema";
import { logError } from "@/lib/logging";

/**
 * Type for database settings data (unknown from JSONB)
 */
interface DatabaseSettingsRow {
  data: unknown;
}

/**
 * Safely merges database settings with defaults
 */
function mergeSettingsWithDefaults(settingsData: DatabaseSettingsRow | null): Settings {
  if (!settingsData?.data || typeof settingsData.data !== "object" || settingsData.data === null) {
    return defaultSettings;
  }

  try {
    const dbData = settingsData.data as Record<string, unknown>;

    return settingsSchema.parse({
      appearance: {
        ...defaultSettings.appearance,
        ...(typeof dbData.appearance === "object" && dbData.appearance !== null
          ? dbData.appearance
          : {}),
      },
      chat: {
        ...defaultSettings.chat,
        ...(typeof dbData.chat === "object" && dbData.chat !== null ? dbData.chat : {}),
      },
      suggestions: {
        ...defaultSettings.suggestions,
        ...(typeof dbData.suggestions === "object" && dbData.suggestions !== null
          ? dbData.suggestions
          : {}),
      },
    });
  } catch (parseError) {
    logError("API", "Failed to parse settings from database, using defaults", parseError);
    return defaultSettings;
  }
}

/**
 * GET /api/settings
 *
 * Retrieves the authenticated user's settings from the database.
 * Returns default settings if no record exists.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("settings")
      .select("data")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) {
      logError("API", "Error fetching settings", settingsError);
      return NextResponse.json<ApiErrorResponse>(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Merge database settings with defaults and validate
    const settings = mergeSettingsWithDefaults(settingsData as DatabaseSettingsRow | null);

    // Build account info from auth user
    const accountInfo = accountInfoSchema.parse({
      id: user.id,
      email: user.email,
      displayName: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
      createdAt: user.created_at,
    });

    return NextResponse.json<SettingsApiResponse>({
      settings,
      account: accountInfo,
    });
  } catch (error) {
    logError("API", "Error in GET /api/settings", error);
    return NextResponse.json<ApiErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/settings
 *
 * Updates the authenticated user's settings in the database.
 * Validates input and uses upsert semantics.
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedSettings = settingsSchema.parse(body);

    // Upsert settings
    const { error: upsertError } = await supabase.from("settings").upsert(
      {
        user_id: user.id,
        data: validatedSettings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (upsertError) {
      logError("API", "Error upserting settings", upsertError);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json<SettingsUpdateResponse>({
      success: true,
      settings: validatedSettings,
    });
  } catch (error) {
    logError("API", "Error in PUT /api/settings", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Invalid settings data", details: error },
        { status: 400 }
      );
    }

    return NextResponse.json<ApiErrorResponse>({ error: "Internal server error" }, { status: 500 });
  }
}
