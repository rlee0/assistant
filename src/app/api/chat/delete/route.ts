import { APIError, authenticationError, handleAPIError, notFoundError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { validateObject, validateUUID } from "@/lib/api/validation";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";

interface DeleteChatRequest {
  id: string;
}

function validateDeleteChatRequest(body: unknown): DeleteChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { id } = body as Record<string, unknown>;

  if (!validateUUID(id)) {
    throw new APIError("Chat ID is required and must be a valid UUID", 400);
  }

  return { id };
}

export async function DELETE(request: NextRequest) {
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

    const { id } = validateDeleteChatRequest(bodyResult.value);

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

    // Delete associated records in cascade
    await supabase
      .from("messages")
      .delete()
      .eq("chat_id", id)
      .then((result) => {
        if (result.error) {
          console.error("Failed to delete messages:", result.error);
        }
      });

    await supabase
      .from("checkpoints")
      .delete()
      .eq("chat_id", id)
      .then((result) => {
        if (result.error) {
          console.error("Failed to delete checkpoints:", result.error);
        }
      });

    // Delete the chat itself
    const { error: delChatError } = await supabase.from("chats").delete().eq("id", id);

    if (delChatError) {
      throw new APIError(delChatError.message, 400);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Chat deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
