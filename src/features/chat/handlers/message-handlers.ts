import { TOAST_MESSAGES } from "@/features/chat/constants";
import type { UseChatMessage } from "../types";
import { isTextPart } from "../utils/message-parts";
import { logWarn } from "@/lib/logging";
import { toast } from "sonner";

/**
 * Validates a message index exists in the messages array
 *
 * @param messages - Array of messages
 * @param messageId - Message ID to find
 * @returns The index of the message, or -1 if not found
 */
export function findMessageIndex(
  messages: ReadonlyArray<UseChatMessage>,
  messageId: string
): number {
  return messages.findIndex((m) => m.id === messageId);
}

/**
 * Validates and extracts the message at the given index
 *
 * @param messages - Array of messages
 * @param messageId - Message ID to validate
 * @returns The message index if found, or null with error toast
 */
export function validateMessageExists(
  messages: ReadonlyArray<UseChatMessage>,
  messageId: string
): number | null {
  const index = findMessageIndex(messages, messageId);
  if (index === -1) {
    logWarn("[Chat]", "Message not found", { messageId });
    toast.error("Message not found. Please try again.");
    return null;
  }
  return index;
}

/**
 * Validates that a message is of the expected role
 *
 * @param message - The message to validate
 * @param expectedRole - Expected message role
 * @returns True if the message has the expected role
 */
export function validateMessageRole(
  message: UseChatMessage,
  expectedRole: "user" | "assistant"
): boolean {
  return message.role === expectedRole;
}

/**
 * Extracts text content from a message's parts using type-safe guards
 *
 * @param message - Message to extract text from
 * @returns Concatenated text content
 */
export function extractMessageText(message: UseChatMessage): string {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (isTextPart(part)) {
      textParts.push(part.text);
    }
  }

  return textParts.join("\n");
}

/**
 * Validates edit text is not empty
 *
 * @param text - Text to validate
 * @returns True if text is valid (non-empty after trim)
 */
export function validateEditText(text: string): boolean {
  if (!text.trim()) {
    toast.error(TOAST_MESSAGES.MESSAGE_EMPTY);
    return false;
  }
  return true;
}

/**
 * Validates assistant message role for regeneration
 *
 * @param message - Message to validate
 * @returns True if message is from assistant
 */
export function validateRegenerateMessage(message: UseChatMessage): boolean {
  if (message.role !== "assistant") {
    logWarn("[Chat]", "Regenerate requires an assistant message", { messageId: message.id });
    toast.error("Select an assistant message to regenerate.");
    return false;
  }
  return true;
}
