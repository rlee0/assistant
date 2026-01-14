import { NextRequest, NextResponse } from "next/server";
import { v5 as uuidv5 } from "uuid";
import { logError } from "@/lib/logging";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type ChatMessage } from "@/types/chat";
import {
  validateString,
  validateBoolean,
  validateArray,
  validateUUID,
  validateObject,
  UUID_REGEX,
} from "@/lib/api/validation";
import { handleAPIError, APIError, authenticationError, notFoundError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/middleware";

interface UpdateChatRequest {
  id: string;
  title?: string;
  pinned?: boolean;
  messages?: ChatMessage[];
}

const MESSAGE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function normalizeMessageId(messageId: string) {
  return UUID_REGEX.test(messageId) ? messageId : uuidv5(messageId, MESSAGE_NAMESPACE);
}

function validateUpdateChatRequest(body: unknown): UpdateChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { id, title, pinned, messages } = body as Record<string, unknown>;

  if (!validateUUID(id)) {
    throw new APIError("Chat ID is required and must be a valid UUID", 400);
  }

  const request: UpdateChatRequest = { id };

  if (title !== undefined) {
    if (!validateString(title)) {
      throw new APIError("Title must be a non-empty string", 400);
    }
    request.title = title.trim();
  }

  if (pinned !== undefined) {
    if (!validateBoolean(pinned)) {
      throw new APIError("Pinned must be a boolean", 400);
    }
    request.pinned = pinned;
  }

  if (messages !== undefined) {
    if (!validateArray(messages)) {
      throw new APIError("Messages must be an array", 400);
    }
    request.messages = messages as ChatMessage[];
  }

  // Check that at least one field is provided (besides id)
  if (title === undefined && pinned === undefined && messages === undefined) {
    throw new APIError("At least one field to update is required", 400);
  }

  return request;
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) {
      throw bodyResult.error;
    }

    const { id, title, pinned, messages } = validateUpdateChatRequest(bodyResult.value);

    // Verify chat belongs to user
    const { data: existingChat, error: fetchError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingChat) {
      return notFoundError("Chat");
    }

    // Build update payload for chat
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = title;
    if (pinned !== undefined) updatePayload.is_pinned = pinned;

    // Update chat metadata
    const { data: updatedChat, error: updateError } = await supabase
      .from("chats")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      throw new APIError(updateError.message, 400);
    }

    // Update messages if provided
    if (messages !== undefined && messages.length > 0) {
      const messagePayload = messages.map((m) => ({
        id: normalizeMessageId(m.id),
        chat_id: id,
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? ""),
        created_at: m.createdAt,
      }));

      const { error: messagesError } = await supabase.from("messages").upsert(messagePayload);

      if (messagesError) {
        logError("[Chat Update]", "Failed to update messages", messagesError, { chatId: id });
      }
    }

    return NextResponse.json(
      {
        success: true,
        chat: {
          id: updatedChat.id,
          title: updatedChat.title,
          pinned: updatedChat.is_pinned ?? false,
          updatedAt: updatedChat.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}
