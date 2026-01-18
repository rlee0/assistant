import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import {
  type ChatSession,
  type ChatMessage,
  type ChatCheckpoint,
  type InitialChatData,
} from "@/features/chat/types";
import { DEFAULT_MODEL } from "@/lib/constants/models";

/**
 * Database row types (what Supabase returns)
 */
interface ChatRow {
  id: string;
  title: string;
  model: string | null;
  context: string | null;
  is_pinned: boolean | null;
  updated_at: string | null;
}

interface MessageRow {
  id: string;
  chat_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface CheckpointRow {
  id: string;
  chat_id: string;
  message_index: number;
  timestamp: string;
}

/**
 * Load initial chat data from Supabase
 *
 * Strategy: Parallel queries for optimal performance
 * - Loads all chats, messages, and checkpoints in one Promise.all()
 * - Maps flat database rows to nested conversation objects
 * - Does NOT auto-select a conversation (caller/client decides)
 *
 * @param userId - Authenticated user ID
 * @returns Initial chat data for client hydration
 * @throws {Error} If Supabase queries fail
 */
export async function loadInitialChats(userId: string): Promise<InitialChatData> {
  const supabase = await createSupabaseServerClient();

  // Execute all queries in parallel for optimal database throughput
  const [chatsResult, messagesResult, checkpointsResult] = await Promise.all([
    supabase
      .from("chats")
      .select("id,title,model,context,is_pinned,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id,chat_id,role,content,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("checkpoints")
      .select("id,chat_id,message_index,timestamp")
      .eq("user_id", userId)
      .order("timestamp", { ascending: true }),
  ]);

  const chatRows: ChatRow[] = chatsResult.data ?? [];
  const messageRows: MessageRow[] = messagesResult.data ?? [];
  const checkpointRows: CheckpointRow[] = checkpointsResult.data ?? [];

  // Index messages and checkpoints by chat_id for O(1) lookups
  const messagesByChat = new Map<string, MessageRow[]>();
  const checkpointsByChat = new Map<string, CheckpointRow[]>();

  messageRows.forEach((msg): void => {
    if (!messagesByChat.has(msg.chat_id)) {
      messagesByChat.set(msg.chat_id, []);
    }
    messagesByChat.get(msg.chat_id)!.push(msg);
  });

  checkpointRows.forEach((cp): void => {
    if (!checkpointsByChat.has(cp.chat_id)) {
      checkpointsByChat.set(cp.chat_id, []);
    }
    checkpointsByChat.get(cp.chat_id)!.push(cp);
  });

  // Transform database rows to domain objects
  const chats: Record<string, ChatSession> = {};
  const order: string[] = [];

  chatRows.forEach((row): void => {
    const id = row.id;
    const chatMessages = messagesByChat.get(id) ?? [];
    const chatCheckpoints = checkpointsByChat.get(id) ?? [];

    // Convert message rows to domain objects
    const messages: ChatMessage[] = chatMessages.map(
      (m): ChatMessage => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at,
      })
    );

    // Convert checkpoint rows to domain objects
    const checkpoints: ChatCheckpoint[] = chatCheckpoints.map(
      (cp): ChatCheckpoint => ({
        id: cp.id,
        messageIndex: cp.message_index,
        timestamp: cp.timestamp,
      })
    );

    // Build chat session with defaults
    chats[id] = {
      id,
      title: row.title,
      pinned: row.is_pinned ?? false,
      updatedAt: row.updated_at ?? new Date().toISOString(),
      model: row.model ?? DEFAULT_MODEL,
      context: row.context ?? undefined,
      suggestions: [],
      messages,
      checkpoints,
    };

    order.push(id);
  });

  return {
    chats,
    order,
    userId, // For validation on client side
    // Note: selectedId is intentionally omitted - client/UI decides selection
  };
}
