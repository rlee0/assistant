import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { type ChatSession, type ChatMessage, type ChatCheckpoint } from "@/store/chat-store";

export type InitialChatData = {
  chats: Record<string, ChatSession>;
  order: string[];
  selectedId?: string;
};

export async function loadInitialChats(userId: string): Promise<InitialChatData> {
  const supabase = createSupabaseServerClient();

  const { data: chatRows = [] } = await supabase
    .from("chats")
    .select("id,title,pinned,updated_at,model,context,suggestions")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  const { data: messageRows = [] } = await supabase
    .from("messages")
    .select("id,chat_id,role,content,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  const { data: checkpointRows = [] } = await supabase
    .from("checkpoints")
    .select("chat_id,payload,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

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
      .map((c) => c.payload as ChatMessage[]);

    chats[id] = {
      id,
      title: row.title,
      pinned: row.pinned ?? false,
      updatedAt: row.updated_at ?? new Date().toISOString(),
      model: row.model,
      context: row.context ?? undefined,
      suggestions: (row.suggestions as string[]) ?? [],
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
