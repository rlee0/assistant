import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { loadSettings } from "@/lib/supabase/settings";
import { settingsSchema, buildDefaultSettings } from "@/lib/settings";
import { APIError, authenticationError, handleAPIError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/middleware";

/**
 * GET /api/settings
 *
 * Retrieve the authenticated user's settings from the database.
 * Returns default settings if no record exists for this user.
 *
 * @requires Authentication via session cookie
 * @returns JSON with success flag and Settings object
 * @throws 401 if user is not authenticated
 * @throws 500 if database query fails
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const settings = await loadSettings(user.id);

    // Return defaults if no settings exist for this user
    const resolvedSettings = settings ? settingsSchema.parse(settings) : buildDefaultSettings();

    return NextResponse.json({
      success: true,
      settings: resolvedSettings,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * PUT /api/settings
 *
 * Persist the authenticated user's settings to the database.
 * Validates input against the settings schema before saving.
 * Uses upsert semantics to create or update existing settings.
 *
 * @requires Authentication via session cookie
 * @param request - HTTP request containing settings payload in body
 * @returns JSON with success flag and persisted Settings object
 * @throws 400 if request body is invalid or settings validation fails
 * @throws 401 if user is not authenticated
 * @throws 500 if database operation fails
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const bodyResult = await parseRequestBody(request);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    // Validate settings against schema to ensure data integrity
    const validatedSettings = settingsSchema.parse(bodyResult);

    // Persist to database with upsert semantics
    // The settings table uses user_id as a required column to link settings to users
    const { error: upsertError } = await supabase
      .from("settings")
      .upsert(
        {
          user_id: user.id,
          data: validatedSettings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select();

    if (upsertError) {
      console.error("[API] Settings upsert failed:", {
        userId: user.id,
        error: upsertError.message,
        code: upsertError.code,
      });

      throw new APIError("Failed to persist settings to database. Please try again.", 500);
    }

    return NextResponse.json({
      success: true,
      settings: validatedSettings,
    });
  } catch (error) {
    return handleAPIError(error);
  }
}
