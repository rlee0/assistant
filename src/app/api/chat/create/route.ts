import { APIError, ErrorCodes, handleAPIError } from "@/lib/api/errors";
import { logDebug, logError } from "@/lib/logging";

import { DEFAULT_MODEL } from "@/lib/constants/models";
import { NextRequest } from "next/server";
import { chatCreateSchema } from "@/lib/api/schemas";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { v4 as uuid } from "uuid";

/**
 * Create a new chat conversation
 *
 * POST /api/chat/create
 * Body: { title?, model?, context?, pinned? }
 *
 * Returns: { success: true, chat: ChatSession }
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Authenticate
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("Authentication required", 401, ErrorCodes.UNAUTHORIZED);
    }

    // Parse and validate request body with Zod schema
    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) throw bodyResult.error;

    let validated;
    try {
      validated = chatCreateSchema.parse(bodyResult.value);
    } catch (validationError) {
      throw new APIError(
        validationError instanceof Error ? validationError.message : "Invalid request",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const { title, model, context, pinned } = validated;
    const chatId = uuid();
    const now = new Date().toISOString();

    logDebug("[Chat Create]", "Creating conversation", { requestId, userId: user.id });

    // Insert chat into database
    const { data: chatData, error: createError } = await supabase
      .from("chats")
      .insert({
        id: chatId,
        user_id: user.id,
        title: title ?? "New chat",
        model: model ?? DEFAULT_MODEL,
        context: context,
        is_pinned: pinned ?? false,
        updated_at: now,
      })
      .select()
      .single();

    if (createError || !chatData) {
      logError(
        "[Chat Create]",
        "Database insert failed",
        new Error(createError?.message || "Unknown error"),
        {
          requestId,
          chatId,
        }
      );
      throw new APIError(
        createError?.message ?? "Failed to create chat",
        500,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    logDebug("[Chat Create]", "Chat created successfully", { requestId, chatId });

    return Response.json(
      {
        success: true,
        chat: {
          id: chatData.id,
          title: chatData.title,
          pinned: chatData.is_pinned ?? false,
          updatedAt: chatData.updated_at ?? now,
          model: chatData.model ?? DEFAULT_MODEL,
          context: chatData.context,
          suggestions: [],
          messages: [],
          checkpoints: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error, { requestId });
  }
}
