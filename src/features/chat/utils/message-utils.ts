import type { ChatMessage } from "@/features/chat/types";
import type { UseChatMessage } from "../types";
import { extractTextParts } from "./message-parts";
import type { useChat } from "@ai-sdk/react";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CHAT_TITLE = "New chat";
const TITLE_MAX_LENGTH = 64;
const WHITESPACE_REGEX = /\s+/g;

const STATUS_MAP = {
  streaming: "streaming",
  submitted: "loading",
  error: "error",
  ready: "idle",
} as const;

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Parses and validates a date value (either Date object or ISO string)
 * @internal
 */
function tryParseDate(value: Date | string | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  return null;
}

// ============================================================================
// Exports
// ============================================================================

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
  const normalized = text.replace(WHITESPACE_REGEX, " ").trim();
  if (!normalized) return DEFAULT_CHAT_TITLE;
  if (normalized.length > TITLE_MAX_LENGTH) {
    return `${normalized.slice(0, TITLE_MAX_LENGTH - 1)}…`;
  }
  return normalized;
}

/**
 * Maps useChat hook status to conversation status
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
  return STATUS_MAP[status] ?? "idle";
}

/**
 * Safely extracts timestamp from a message with multiple fallbacks
 *
 * @param message - The message to extract timestamp from
 * @returns Valid Date instance, defaults to current time if extraction fails
 *
 * @remarks
 * Tries both camelCase (createdAt) and snake_case (created_at) properties
 * to support different data sources. Validates date values before returning.
 */
export function extractTimestamp(message: UseChatMessage): Date {
  // Guard: ensure message is an object (shouldn't fail with proper typing, but safe)
  if (!message || typeof message !== "object") {
    return new Date();
  }

  const msg = message as unknown as { createdAt?: Date | string; created_at?: Date | string };

  // Try camelCase property
  const camelCaseDate = tryParseDate(msg.createdAt);
  if (camelCaseDate) return camelCaseDate;

  // Try snake_case property (legacy support)
  const snakeCaseDate = tryParseDate(msg.created_at);
  if (snakeCaseDate) return snakeCaseDate;

  // Fallback to current time
  return new Date();
}

/**
 * Converts a useChat message to a stored ChatMessage
 *
 * @param message - The useChat message to convert
 * @returns The converted ChatMessage suitable for storage
 *
 * @remarks
 * Preserves the full message structure including all parts (text, tool calls, etc.)
 * by storing the parts array as JSON to ensure tool display components persist
 * across page refreshes. Falls back to extracting text only if no parts are available.
 *
 * @example
 * ```ts
 * const stored = uiMessageToChatMessage(uiMessage);
 * ```
 */
export function uiMessageToChatMessage(message: UseChatMessage): ChatMessage {
  const timestamp = extractTimestamp(message);

  // Preserve full message structure by storing parts as JSON
  // This ensures tool calls, reasoning, and other UI parts persist across refreshes
  const content = message.parts ? JSON.stringify(message.parts) : extractTextFromMessage(message);

  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    content,
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
