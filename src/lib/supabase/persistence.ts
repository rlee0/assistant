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
  try {
    const { error } = await supabase.client
      .from("chats")
      .upsert({
        id: session.id,
        title: session.title,
        pinned: session.pinned,
        updated_at: session.updatedAt ?? new Date().toISOString(),
        context: session.context,
      })
      .select();
    if (error) console.error("Persist chat failed", error);
  } catch (error) {
    console.error("Persist chat failed", error);
  }
}

export async function persistMessages(chatId: string, messages: ChatMessage[]) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  const payload = messages.map((m) => ({
    id: m.id,
    chat_id: chatId,
    role: m.role,
    content: m.content,
    created_at: m.createdAt,
  }));
  if (!payload.length) return;
  try {
    const { error } = await supabase.client.from("messages").upsert(payload);
    if (error) console.error("Persist messages failed", error);
  } catch (error) {
    console.error("Persist messages failed", error);
  }
}

export async function deleteChatCascade(chatId: string) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  try {
    const { error: delMessagesError } = await supabase.client
      .from("messages")
      .delete()
      .eq("chat_id", chatId);
    if (delMessagesError) console.error("Delete messages failed", delMessagesError);

    const { error: delCheckpointsError } = await supabase.client
      .from("checkpoints")
      .delete()
      .eq("chat_id", chatId);
    if (delCheckpointsError)
      console.error("Delete checkpoints failed", delCheckpointsError);

    const { error: delChatError } = await supabase.client
      .from("chats")
      .delete()
      .eq("id", chatId);
    if (delChatError) console.error("Delete chat failed", delChatError);
  } catch (error) {
    console.error("Delete chat cascade failed", error);
  }
}

export async function persistCheckpoint(chatId: string, checkpoint: ChatCheckpoint) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  try {
    const { error } = await supabase.client.from("checkpoints").insert({
      chat_id: chatId,
      payload: checkpoint,
      created_at: new Date().toISOString(),
    });
    if (error) console.error("Persist checkpoint failed", error);
  } catch (error) {
    console.error("Persist checkpoint failed", error);
  }
}
