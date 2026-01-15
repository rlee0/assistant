import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type ChatSession, type ChatMessage, type ChatCheckpoint } from "@/types/chat";
import { validateUUID } from "@/lib/api/validation";
import { handleAPIError, authenticationError, notFoundError } from "@/lib/api/errors";
import { DEFAULT_MODEL } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return authenticationError();
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("id");

    // If specific chat ID is provided, return that chat
    if (chatId) {
      if (!validateUUID(chatId)) {
        return NextResponse.json({ error: "Invalid chat ID format" }, { status: 400 });
      }

      const { data: chatData, error: chatError } = await supabase
        .from("chats")
        .select("id,title,is_pinned,updated_at")
        .eq("id", chatId)
        .eq("user_id", user.id)
        .single();

      if (chatError || !chatData) {
        return notFoundError("Chat");
      }

      const { data: messagesData } = await supabase
        .from("messages")
        .select("id,role,content,created_at")
        .eq("chat_id", chatId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const { data: checkpointsData } = await supabase
        .from("checkpoints")
        .select("id,message_index,timestamp")
        .eq("chat_id", chatId)
        .eq("user_id", user.id)
        .order("timestamp", { ascending: true });

      const messages: ChatMessage[] = (messagesData ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      }));

      const checkpoints: ChatCheckpoint[] = (checkpointsData ?? []).map((c) => ({
        id: c.id,
        messageIndex: c.message_index,
        timestamp: c.timestamp,
      }));

      const chat: ChatSession = {
        id: chatData.id,
        title: chatData.title,
        pinned: chatData.is_pinned ?? false,
        updatedAt: chatData.updated_at ?? new Date().toISOString(),
        model: DEFAULT_MODEL,
        suggestions: [],
        messages,
        checkpoints,
      };

      return NextResponse.json({ chat }, { status: 200 });
    }

    // Otherwise, return all chats for the user (with filtered messages)
    const { data: chatRowsData } = await supabase
      .from("chats")
      .select("id,title,is_pinned,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    const chatRows = chatRowsData ?? [];

    const { data: messageRowsData } = await supabase
      .from("messages")
      .select("id,chat_id,role,content,created_at")
      .eq("user_id", user.id)
      .in(
        "chat_id",
        chatRows.map((c) => c.id)
      )
      .order("created_at", { ascending: true });

    const messageRows = messageRowsData ?? [];

    const { data: checkpointRowsData } = await supabase
      .from("checkpoints")
      .select("id,chat_id,message_index,timestamp")
      .eq("user_id", user.id)
      .in(
        "chat_id",
        chatRows.map((c) => c.id)
      )
      .order("timestamp", { ascending: true });

    const checkpointRows = checkpointRowsData ?? [];

    const chats: Record<string, ChatSession> = {};
    const order: string[] = [];

    chatRows.forEach((row) => {
      const id = row.id;
      const messages: ChatMessage[] = messageRows
        .filter((m) => m.chat_id === id)
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.created_at,
        }));

      const checkpoints: ChatCheckpoint[] = checkpointRows
        .filter((c) => c.chat_id === id)
        .map((c) => ({
          id: c.id,
          messageIndex: c.message_index,
          timestamp: c.timestamp,
        }));

      chats[id] = {
        id,
        title: row.title,
        pinned: row.is_pinned ?? false,
        updatedAt: row.updated_at ?? new Date().toISOString(),
        model: DEFAULT_MODEL,
        suggestions: [],
        messages,
        checkpoints,
      };
      order.push(id);
    });

    return NextResponse.json(
      {
        chats,
        order,
        selectedId: order[0],
      },
      { status: 200 }
    );
  } catch (error) {
    return handleAPIError(error);
  }
}
