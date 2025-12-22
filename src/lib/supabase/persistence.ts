"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { type ChatSession, type ChatMessage, type ChatCheckpoint } from "@/store/chat-store";

async function supabaseClient() {
  try {
    const client = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    return { client, userId: user?.id };
  } catch {
    return null;
  }
}

export async function persistChat(session: ChatSession) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  await supabase.client.from("chats").upsert({
    id: session.id,
    user_id: supabase.userId,
    title: session.title,
    pinned: session.pinned,
    updated_at: session.updatedAt,
    model: session.model,
    context: session.context,
    suggestions: session.suggestions,
  });
}

export async function persistMessages(chatId: string, messages: ChatMessage[]) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  const payload = messages.map((m) => ({
    id: m.id,
    user_id: supabase.userId,
    chat_id: chatId,
    role: m.role,
    content: m.content,
    created_at: m.createdAt,
  }));
  if (!payload.length) return;
  await supabase.from("messages").upsert(payload);
}

export async function deleteChatCascade(chatId: string) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  await supabase.client
    .from("messages")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", supabase.userId);
  await supabase.client
    .from("checkpoints")
    .delete()
    .eq("chat_id", chatId)
    .eq("user_id", supabase.userId);
  await supabase.client
    .from("chats")
    .delete()
    .eq("id", chatId)
    .eq("user_id", supabase.userId);
}

export async function persistCheckpoint(chatId: string, checkpoint: ChatCheckpoint) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  await supabase.client.from("checkpoints").insert({
    user_id: supabase.userId,
    chat_id: chatId,
    payload: checkpoint,
  });
}
