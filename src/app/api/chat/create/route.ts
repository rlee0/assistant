import { APIError, authenticationError, handleAPIError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { validateBoolean, validateObject, validateString } from "@/lib/api/validation";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { v4 as uuid } from "uuid";

interface CreateChatRequest {
  title?: string;
  model?: string;
  context?: string;
  pinned?: boolean;
}

function validateCreateChatRequest(body: unknown): CreateChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { title, model, context, pinned } = body as Record<string, unknown>;
  const request: CreateChatRequest = {};

  if (title !== undefined) {
    if (!validateString(title)) {
      throw new APIError("Title must be a non-empty string", 400);
    }
    request.title = title.trim();
  }

  if (model !== undefined) {
    if (!validateString(model)) {
      throw new APIError("Model must be a non-empty string", 400);
    }
    request.model = model.trim();
  }

  if (context !== undefined) {
    if (!validateString(context, true)) {
      throw new APIError("Context must be a string", 400);
    }
    request.context = context as string;
  }

  if (pinned !== undefined) {
    if (!validateBoolean(pinned)) {
      throw new APIError("Pinned must be a boolean", 400);
    }
    request.pinned = pinned;
  }

  return request;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
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

    const { title, model, context, pinned } = validateCreateChatRequest(bodyResult);
    const chatId = uuid();
    const now = new Date().toISOString();

    const { data: chatData, error: createError } = await supabase
      .from("chats")
      .insert({
        id: chatId,
        user_id: user.id,
        title: title ?? "New chat",
        is_pinned: pinned ?? false,
        updated_at: now,
      })
      .select()
      .single();

    if (createError || !chatData) {
      throw new APIError(createError?.message ?? "Failed to create chat", 500);
    }

    return NextResponse.json(
      {
        success: true,
        chat: {
          id: chatData.id,
          title: chatData.title,
          pinned: chatData.is_pinned ?? false,
          updatedAt: chatData.updated_at ?? now,
          model: model ?? "gpt-4o-mini",
          context,
          suggestions: [],
          messages: [],
          checkpoints: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
