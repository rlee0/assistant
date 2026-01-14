import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type ChatSession, type ChatMessage, type ChatCheckpoint } from "@/types/chat";
import { DEFAULT_MODEL } from "@/lib/constants";

export type InitialChatData = {
  chats: Record<string, ChatSession>;
  order: string[];
  selectedId?: string;
};

/**
 * Load initial chat data with optimized batching
 *
 * Loads all required data (chats, messages, checkpoints) in parallel
 * to minimize database round trips. This is better than sequential queries.
 *
 * For future optimization: Consider using Supabase Joins if the schema supports it,
 * or implementing a database view/function that combines this data server-side.
 */
export async function loadInitialChats(userId: string): Promise<InitialChatData> {
  const supabase = await createSupabaseServerClient();

  // Execute all queries in parallel instead of sequentially
  const [{ data: chatRowsData }, { data: messageRowsData }, { data: checkpointRowsData }] =
    await Promise.all([
      supabase
        .from("chats")
        .select("id,title,is_pinned,updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("messages")
        .select("id,chat_id,role,content,created_at")
        .order("created_at", { ascending: true }),
      supabase
        .from("checkpoints")
        .select("id,chat_id,message_index,timestamp")
        .order("timestamp", { ascending: true }),
    ]);

  const chatRows = chatRowsData ?? [];
  const messageRows = messageRowsData ?? [];
  const checkpointRows = checkpointRowsData ?? [];

  // Index messages by chat_id for O(1) lookup instead of O(n) filter
  const messagesByChat = new Map<string, typeof messageRows>();

  messageRows.forEach((msg) => {
    if (!messagesByChat.has(msg.chat_id)) {
      messagesByChat.set(msg.chat_id, []);
    }
    messagesByChat.get(msg.chat_id)!.push(msg);
  });

  // Index checkpoints by chat_id for O(1) lookup
  const checkpointsByChat = new Map<string, typeof checkpointRows>();

  checkpointRows.forEach((cp) => {
    if (!checkpointsByChat.has(cp.chat_id)) {
      checkpointsByChat.set(cp.chat_id, []);
    }
    checkpointsByChat.get(cp.chat_id)!.push(cp);
  });

  const chats: Record<string, ChatSession> = {};
  const order: string[] = [];

  chatRows.forEach((row) => {
    const id = row.id;
    const chatMessages = messagesByChat.get(id) ?? [];
    const chatCheckpoints = checkpointsByChat.get(id) ?? [];

    const messages: ChatMessage[] = chatMessages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    }));

    const checkpoints: ChatCheckpoint[] = chatCheckpoints.map((cp) => ({
      id: cp.id,
      messageIndex: cp.message_index,
      timestamp: cp.timestamp,
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

  return {
    chats,
    order,
    selectedId: order[0],
  };
}
