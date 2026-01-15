"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { PostgrestError } from "@supabase/supabase-js";
import { type ChatSession, type ChatMessage, type ChatCheckpoint } from "@/types/chat";
import { v5 as uuidv5 } from "uuid";

const MESSAGE_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeMessageId(messageId: string) {
  return UUID_REGEX.test(messageId) ? messageId : uuidv5(messageId, MESSAGE_NAMESPACE);
}

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
        user_id: supabase.userId,
        title: session.title,
        is_pinned: session.pinned,
        updated_at: session.updatedAt ?? new Date().toISOString(),
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
    id: normalizeMessageId(m.id),
    chat_id: chatId,
    user_id: supabase.userId,
    role: m.role,
    content: typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? ""),
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
    if (delCheckpointsError) console.error("Delete checkpoints failed", delCheckpointsError);

    const { error: delChatError } = await supabase.client.from("chats").delete().eq("id", chatId);
    if (delChatError) console.error("Delete chat failed", delChatError);
  } catch (error) {
    console.error("Delete chat cascade failed", error);
  }
}

export async function persistCheckpoint(chatId: string, checkpoint: ChatCheckpoint) {
  const supabase = await supabaseClient();
  if (!supabase || !supabase.userId) return;
  try {
    const { error } = await supabase.client
      .from("checkpoints")
      .insert({
        id: checkpoint.id,
        chat_id: chatId,
        user_id: supabase.userId,
        message_index: checkpoint.messageIndex,
        timestamp: checkpoint.timestamp,
      })
      .select();
    if (error) {
      const pgError = error as PostgrestError;
      console.error("Persist checkpoint failed", {
        message: pgError?.message,
        details: pgError?.details,
        hint: pgError?.hint,
        code: pgError?.code,
      });
    }
  } catch (error) {
    console.error("Persist checkpoint failed", error);
  }
}
