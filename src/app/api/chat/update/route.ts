import { NextRequest, NextResponse } from "next/server";
import { v5 as uuidv5 } from "uuid";
import { logError } from "@/lib/logging";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type ChatMessage, type ChatCheckpoint } from "@/features/chat/types";
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

type ChatUpdatePayload = {
  updated_at: string;
  title?: string;
  is_pinned?: boolean;
  model?: string;
  context?: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
};

type CheckpointRow = {
  id: string;
  chat_id: string;
  user_id: string;
  message_index: number;
  timestamp: string;
  created_at: string;
};

interface UpdateChatRequest {
  id: string;
  title?: string;
  pinned?: boolean;
  model?: string;
  context?: string;
  messages?: ChatMessage[];
  checkpoints?: ChatCheckpoint[];
}

const MESSAGE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const CHECKPOINT_NAMESPACE = "6ba7b811-9dad-11d1-80b4-00c04fd430c9";

function normalizeMessageId(messageId: string): string {
  return UUID_REGEX.test(messageId) ? messageId : uuidv5(messageId, MESSAGE_NAMESPACE);
}

function normalizeCheckpointId(checkpointId: string): string {
  return UUID_REGEX.test(checkpointId) ? checkpointId : uuidv5(checkpointId, CHECKPOINT_NAMESPACE);
}

function isValidMessage(value: unknown): value is ChatMessage {
  if (!validateObject(value)) return false;
  const msg = value as Record<string, unknown>;
  return (
    validateString(msg.id) &&
    validateString(msg.role) &&
    (typeof msg.content === "string" || validateArray(msg.content)) &&
    validateString(msg.createdAt)
  );
}

function isValidCheckpoint(value: unknown): value is ChatCheckpoint {
  if (!validateObject(value)) return false;
  const cp = value as Record<string, unknown>;
  return (
    validateString(cp.id) && typeof cp.messageIndex === "number" && validateString(cp.timestamp)
  );
}

function validateUpdateChatRequest(body: unknown): UpdateChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { id, title, pinned, model, context, messages, checkpoints } = body as Record<
    string,
    unknown
  >;

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

  if (model !== undefined) {
    if (!validateString(model)) {
      throw new APIError("Model must be a non-empty string", 400);
    }
    request.model = model.trim();
  }

  if (context !== undefined) {
    if (typeof context !== "string") {
      throw new APIError("Context must be a string", 400);
    }
    request.context = context as string;
  }

  if (messages !== undefined) {
    if (!validateArray(messages)) {
      throw new APIError("Messages must be an array", 400);
    }
    if (!messages.every(isValidMessage)) {
      throw new APIError("Invalid message format", 400);
    }
    request.messages = messages;
  }

  if (checkpoints !== undefined) {
    if (!validateArray(checkpoints)) {
      throw new APIError("Checkpoints must be an array", 400);
    }
    if (!checkpoints.every(isValidCheckpoint)) {
      throw new APIError("Invalid checkpoint format", 400);
    }
    request.checkpoints = checkpoints;
  }

  // Check that at least one field is provided (besides id)
  if (
    title === undefined &&
    pinned === undefined &&
    model === undefined &&
    context === undefined &&
    messages === undefined &&
    checkpoints === undefined
  ) {
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

    const { id, title, pinned, model, context, messages, checkpoints } = validateUpdateChatRequest(
      bodyResult.value
    );

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
    const updatePayload: ChatUpdatePayload = {
      updated_at: new Date().toISOString(),
    };
    if (title !== undefined) updatePayload.title = title;
    if (pinned !== undefined) updatePayload.is_pinned = pinned;
    if (model !== undefined) updatePayload.model = model;
    if (context !== undefined) updatePayload.context = context;

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
    if (messages !== undefined) {
      // Build the message payload for provided messages
      const messagePayload: MessageRow[] = messages.map((m) => ({
        id: normalizeMessageId(m.id),
        chat_id: id,
        user_id: user.id,
        role: m.role,
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        created_at: m.createdAt,
      }));

      // If messages are provided (even empty array), delete messages not in the new list
      // This handles checkpoint restoration where old messages beyond the checkpoint need to be removed
      if (messages.length > 0) {
        // Get all existing message IDs for this chat
        const { data: existingMessages } = await supabase
          .from("messages")
          .select("id, created_at")
          .eq("chat_id", id)
          .eq("user_id", user.id);

        if (existingMessages && existingMessages.length > 0) {
          // Create a set of new message IDs for quick lookup
          const newMessageIds = new Set(messagePayload.map((m) => m.id));

          // Find messages to delete (those in DB but not in new payload)
          const messagesToDelete = existingMessages
            .filter((m) => !newMessageIds.has(m.id))
            .map((m) => m.id);

          // Delete old messages that are no longer in the conversation
          if (messagesToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from("messages")
              .delete()
              .in("id", messagesToDelete);

            if (deleteError) {
              logError("[Chat Update]", "Failed to delete old messages", deleteError, {
                chatId: id,
              });
              throw new APIError(deleteError.message ?? "Failed to delete old messages", 500);
            }
          }
        }
      }

      // Upsert the remaining messages
      if (messagePayload.length > 0) {
        const { error: messagesError } = await supabase.from("messages").upsert(messagePayload);

        if (messagesError) {
          logError("[Chat Update]", "Failed to update messages", messagesError, { chatId: id });
          throw new APIError(messagesError.message ?? "Failed to update messages", 500);
        }
      }
    }

    // Persist checkpoints if provided
    if (checkpoints !== undefined) {
      // Build the checkpoint payload for provided checkpoints
      const checkpointPayload: CheckpointRow[] = checkpoints.map((cp) => ({
        id: normalizeCheckpointId(cp.id),
        chat_id: id,
        user_id: user.id,
        message_index: cp.messageIndex,
        timestamp: cp.timestamp,
        created_at: cp.timestamp,
      }));

      // If checkpoints are provided (even empty array), delete checkpoints not in the new list
      // This handles checkpoint restoration where old checkpoints beyond the restored point need to be removed
      if (checkpoints.length > 0) {
        // Get all existing checkpoint IDs for this chat
        const { data: existingCheckpoints } = await supabase
          .from("checkpoints")
          .select("id")
          .eq("chat_id", id)
          .eq("user_id", user.id);

        if (existingCheckpoints && existingCheckpoints.length > 0) {
          // Create a set of new checkpoint IDs for quick lookup
          const newCheckpointIds = new Set(checkpointPayload.map((cp) => cp.id));

          // Find checkpoints to delete (those in DB but not in new payload)
          const checkpointsToDelete = existingCheckpoints
            .filter((cp) => !newCheckpointIds.has(cp.id))
            .map((cp) => cp.id);

          // Delete old checkpoints that are no longer in the conversation
          if (checkpointsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from("checkpoints")
              .delete()
              .in("id", checkpointsToDelete);

            if (deleteError) {
              logError("[Chat Update]", "Failed to delete old checkpoints", deleteError, {
                chatId: id,
              });
              throw new APIError(deleteError.message ?? "Failed to delete old checkpoints", 500);
            }
          }
        }
      }

      // Upsert the remaining checkpoints
      if (checkpointPayload.length > 0) {
        const { error: checkpointsError } = await supabase
          .from("checkpoints")
          .upsert(checkpointPayload, { onConflict: "id" });

        if (checkpointsError) {
          logError("[Chat Update]", "Failed to update checkpoints", checkpointsError, {
            chatId: id,
          });
          throw new APIError(checkpointsError.message ?? "Failed to update checkpoints", 500);
        }
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
