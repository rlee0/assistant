/**
 * Centralized validation using Zod
 * Replaces custom type guard functions for better type safety and consistency
 */

import { z } from "zod";
import { type NextRequest } from "next/server";
import { Err, type Result } from "./result";

/**
 * Email validation schema - supports standard email formats
 */
export const emailSchema = z.string().email("Invalid email format").trim().toLowerCase();

/**
 * Password validation schema - requires minimum 8 characters
 */
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid("Invalid UUID format");

/**
 * Validate a value against a Zod schema
 * Returns a Result type for explicit error handling
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
  fieldName: string = "input"
): Result<T> {
  const result = schema.safeParse(value);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"} - ${issue.message}`)
      .join("; ");
    return Err(`${fieldName} validation failed: ${errors}`, "VALIDATION_ERROR", 400);
  }

  return { success: true, data: result.data };
}

/**
 * Parse and validate request JSON body
 */
export async function parseRequestJSON(
  request: NextRequest
): Promise<Result<Record<string, unknown>>> {
  try {
    const body = await request.json();
    if (typeof body !== "object" || body === null) {
      return Err("Request body must be a valid JSON object", "VALIDATION_ERROR", 400);
    }
    return { success: true, data: body as Record<string, unknown> };
  } catch {
    return Err("Invalid JSON in request body", "VALIDATION_ERROR", 400);
  }
}

/**
 * Common message validation schema for chat API
 */
export const messageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

/**
 * Chat request validation schema
 */
export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1, "Messages array must not be empty"),
  model: z.string().optional(),
  context: z.string().optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
