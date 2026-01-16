/**
 * Type-safe utilities for working with AI SDK message parts
 * Replaces unsafe `as Record<string, unknown>` patterns with proper discriminated unions
 */

import type { useChat } from "@ai-sdk/react";

export type UseChatMessage = ReturnType<typeof useChat>["messages"][number];

/**
 * Discriminated union type for all message part types
 * Ensures type safety without casting
 */
export type MessagePart =
  | { readonly type: "text"; readonly text: string }
  | {
      readonly type: "tool-call";
      readonly toolName?: string;
      readonly toolUseId?: string;
      readonly args?: Record<string, unknown>;
    }
  | {
      readonly type: "tool-result";
      readonly toolName?: string;
      readonly toolUseId?: string;
      readonly result?: unknown;
    }
  | { readonly type: "image"; readonly image?: string; readonly mimeType?: string }
  | { readonly type: "reasoning"; readonly text?: string }
  | Record<string, unknown>;

/**
 * Type guard for text parts
 */
export function isTextPart(part: unknown): part is { type: "text"; text: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "text" &&
    "text" in part &&
    typeof (part as Record<string, unknown>).text === "string"
  );
}

/**
 * Type guard for tool-call parts
 */
export function isToolCallPart(part: unknown): part is {
  type: "tool-call";
  toolName?: string;
  toolUseId?: string;
  args?: Record<string, unknown>;
} {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "tool-call"
  );
}

/**
 * Type guard for tool-result parts
 */
export function isToolResultPart(
  part: unknown
): part is { type: "tool-result"; toolName?: string; toolUseId?: string; result?: unknown } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "tool-result"
  );
}

/**
 * Type guard for image parts
 */
export function isImagePart(
  part: unknown
): part is { type: "image"; image?: string; mimeType?: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "image"
  );
}

/**
 * Type guard for reasoning parts
 */
export function isReasoningPart(part: unknown): part is { type: "reasoning"; text?: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "reasoning"
  );
}

/**
 * Safely extracts all text parts from a message
 * Uses type guards instead of casting
 */
export function extractTextParts(message: UseChatMessage): string[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const textParts: string[] = [];

  for (const part of parts) {
    if (isTextPart(part)) {
      textParts.push(part.text);
    }
  }

  return textParts;
}

/**
 * Safely extracts all tool-call parts from a message
 */
export function extractToolCallParts(
  message: UseChatMessage
): Array<{ toolName?: string; toolUseId?: string; args?: Record<string, unknown> }> {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const toolCalls: Array<{
    toolName?: string;
    toolUseId?: string;
    args?: Record<string, unknown>;
  }> = [];

  for (const part of parts) {
    if (isToolCallPart(part)) {
      toolCalls.push({ toolName: part.toolName, toolUseId: part.toolUseId, args: part.args });
    }
  }

  return toolCalls;
}

/**
 * Safely extracts all image parts from a message
 */
export function extractImageParts(message: UseChatMessage): Array<{
  type: "image";
  image?: string;
  mimeType?: string;
}> {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const images: Array<{ type: "image"; image?: string; mimeType?: string }> = [];

  for (const part of parts) {
    if (isImagePart(part)) {
      images.push(part);
    }
  }

  return images;
}

/**
 * Safely extracts all reasoning parts from a message
 */
export function extractReasoningParts(message: UseChatMessage): string[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const reasoning: string[] = [];

  for (const part of parts) {
    if (isReasoningPart(part)) {
      reasoning.push(part.text ?? "");
    }
  }

  return reasoning;
}

/**
 * Type guard for source-url parts
 */
export function isSourceUrlPart(
  part: unknown
): part is { type: "source-url"; url: string; title?: string } {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    (part as Record<string, unknown>).type === "source-url" &&
    "url" in part &&
    typeof (part as Record<string, unknown>).url === "string"
  );
}

/**
 * Safely extract all source URL parts from message
 * Returns properly typed source-url parts.
 */
export function extractSourceUrls(
  message: UseChatMessage
): Array<{ type: "source-url"; url: string; title?: string }> {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const sources: Array<{ type: "source-url"; url: string; title?: string }> = [];

  for (const part of parts) {
    if (isSourceUrlPart(part)) {
      sources.push(part);
    }
  }

  return sources;
}

/**
 * Safely joins text parts into a single string
 */
export function joinTextParts(message: UseChatMessage, separator: string = "\n"): string {
  return extractTextParts(message).join(separator);
}
