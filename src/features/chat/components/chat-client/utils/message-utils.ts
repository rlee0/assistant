import type { ChatMessage } from "@/features/chat/types";
import type { UseChatMessage } from "../types";
import { extractTextParts } from "../message-parts";
import type { useChat } from "@ai-sdk/react";

/**
 * Extracts text content from a message using type-safe utilities
 *
 * @param message - The message to extract text from
 * @returns Concatenated text content from all text parts
 *
 * @example
 * ```ts
 * const text = extractTextFromMessage(message);
 * // "Hello, world!"
 * ```
 */
export function extractTextFromMessage(message: UseChatMessage): string {
  return extractTextParts(message).join("\n").trim() || "";
}

/**
 * Generates a title from text by normalizing whitespace and truncating
 *
 * @param text - The text to generate a title from
 * @returns Generated title, or "New chat" if text is empty
 *
 * @example
 * ```ts
 * const title = generateTitleFromText("Hello, world!");
 * // "Hello, world!"
 *
 * const longTitle = generateTitleFromText("a".repeat(100));
 * // "aaaa...aaa" (truncated to 64 chars)
 * ```
 */
export function generateTitleFromText(text: string): string {
  if (typeof text !== "string") return "New chat";
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";
  const maxLength = 64;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

/**
 * Converts a useChat status to a ConversationStatus
 *
 * @param status - The useChat hook status
 * @returns The mapped ConversationStatus
 *
 * @example
 * ```ts
 * const status = mapUseChatStatus("streaming");
 * // "streaming"
 * ```
 */
export function mapUseChatStatus(
  status: ReturnType<typeof useChat>["status"]
): "idle" | "loading" | "streaming" | "error" {
  if (status === "streaming") return "streaming";
  if (status === "submitted") return "loading";
  if (status === "error") return "error";
  return "idle";
}

/**
 * Safely extracts timestamp from a message with multiple fallbacks
 * Type-safe alternative to loose property checking
 */
export function extractTimestamp(message: UseChatMessage): Date {
  // Check if message has createdAt property with defensive programming
  if (message && typeof message === "object") {
    const msg = message as unknown as { createdAt?: Date | string; created_at?: Date | string };

    // Try createdAt (standard)
    if (msg.createdAt) {
      if (msg.createdAt instanceof Date) return msg.createdAt;
      if (typeof msg.createdAt === "string") {
        const parsed = new Date(msg.createdAt);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }

    // Try created_at (snake_case)
    if (msg.created_at) {
      if (msg.created_at instanceof Date) return msg.created_at;
      if (typeof msg.created_at === "string") {
        const parsed = new Date(msg.created_at);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
    }
  }

  return new Date();
}

/**
 * Converts a useChat message to a stored ChatMessage
 *
 * @param message - The useChat message to convert
 * @returns The converted ChatMessage suitable for storage
 *
 * @remarks
 * Extracts createdAt timestamp from message with fallback to current time
 *
 * @example
 * ```ts
 * const stored = uiMessageToChatMessage(uiMessage);
 * ```
 */
export function uiMessageToChatMessage(message: UseChatMessage): ChatMessage {
  const timestamp = extractTimestamp(message);

  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content: extractTextFromMessage(message),
    createdAt: timestamp.toISOString(),
  };
}

/**
 * Checks if two message arrays are equal
 *
 * @param existing - The existing message array (may be undefined)
 * @param incoming - The incoming message array
 * @returns True if both arrays have the same messages in the same order
 *
 * @remarks
 * Performs deep equality checking on message IDs, roles, and parts
 *
 * @example
 * ```ts
 * const equal = areMessagesEqual(oldMessages, newMessages);
 * ```
 */
export function areMessagesEqual(
  existing: ReadonlyArray<UseChatMessage> | undefined,
  incoming: ReadonlyArray<UseChatMessage>
): boolean {
  if (!existing || existing.length !== incoming.length) return false;

  for (let index = 0; index < existing.length; index += 1) {
    const left = existing[index];
    const right = incoming[index];

    if (left.id !== right.id || left.role !== right.role) return false;

    const leftParts = JSON.stringify(left.parts ?? []);
    const rightParts = JSON.stringify(right.parts ?? []);
    if (leftParts !== rightParts) return false;
  }

  return true;
}
