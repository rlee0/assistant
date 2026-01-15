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
  | { readonly type: "reasoning"; readonly thinking?: string }
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
export function isToolCallPart(
  part: unknown
): part is {
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
export function isReasoningPart(part: unknown): part is { type: "reasoning"; thinking?: string } {
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
export function extractImageParts(message: UseChatMessage): unknown[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const images: unknown[] = [];

  for (const part of parts) {
    if (
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      (part as Record<string, unknown>).type === "image"
    ) {
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
      reasoning.push(part.thinking ?? "");
    }
  }

  return reasoning;
}

/**
 * Safely extract all source URLs from message parts
 * Handles multiple part types that might contain sources
 */
export function extractSourceUrls(message: UseChatMessage): string[] {
  const parts = Array.isArray(message.parts) ? message.parts : [];
  const urls = new Set<string>();

  for (const part of parts) {
    if (
      typeof part === "object" &&
      part !== null &&
      "sources" in part &&
      Array.isArray((part as Record<string, unknown>).sources)
    ) {
      const sources = (part as Record<string, unknown>).sources as unknown[];
      for (const source of sources) {
        if (
          typeof source === "object" &&
          source !== null &&
          "url" in source &&
          typeof (source as Record<string, unknown>).url === "string"
        ) {
          urls.add((source as Record<string, unknown>).url as string);
        }
      }
    }
  }

  return Array.from(urls);
}

/**
 * Safely joins text parts into a single string
 */
export function joinTextParts(message: UseChatMessage, separator: string = "\n"): string {
  return extractTextParts(message).join(separator);
}
