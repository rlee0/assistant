/**
 * Comprehensive Zod schemas for all API request/response types
 *
 * This module provides the single source of truth for API validation across all routes.
 * All incoming request bodies are validated against these schemas before use.
 *
 * @module lib/api/schemas
 */

import { z } from "zod";

// ============================================================================
// Common Schemas
// ============================================================================

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const emailSchema = z.string().email("Invalid email format").toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(255, "Password must be less than 255 characters");

export const modelIdSchema = z
  .string()
  .min(1, "Model ID required")
  .includes("/", { message: "Model ID must include provider prefix (e.g., openai/gpt-4o-mini)" });

// ============================================================================
// Auth Schemas
// ============================================================================

export const accountCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, "Full name required").max(100),
});

export type AccountCreateRequest = z.infer<typeof accountCreateSchema>;

export const accountUpdateSchema = z.object({
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  fullName: z.string().min(2).max(100).optional(),
});

export type AccountUpdateRequest = z.infer<typeof accountUpdateSchema>;

export const accountDeleteSchema = z.object({
  password: passwordSchema,
});

export type AccountDeleteRequest = z.infer<typeof accountDeleteSchema>;

// ============================================================================
// Chat Schemas
// ============================================================================

export const uiMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.union([z.string(), z.array(z.unknown())]),
  createdAt: z.union([z.date(), z.string()]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const chatCreateSchema = z.object({
  title: z.string().min(1, "Title required").max(500).optional(),
  model: modelIdSchema.optional(),
  context: z.string().optional(),
  pinned: z.boolean().optional(),
});

export type ChatCreateRequest = z.infer<typeof chatCreateSchema>;

export const chatUpdateSchema = z.object({
  id: uuidSchema,
  title: z.string().min(1).max(500).optional(),
  pinned: z.boolean().optional(),
  model: modelIdSchema.optional(),
  context: z.string().optional(),
  messages: z.array(uiMessageSchema).optional(),
  checkpoints: z
    .array(
      z.object({
        id: z.string(),
        messageIndex: z.number().int().min(0),
        timestamp: z.union([z.date(), z.string()]),
      })
    )
    .optional(),
});

export type ChatUpdateRequest = z.infer<typeof chatUpdateSchema>;

export const chatDeleteSchema = z.object({
  id: uuidSchema,
});

export type ChatDeleteRequest = z.infer<typeof chatDeleteSchema>;

// ============================================================================
// Suggestions Schemas
// ============================================================================

export const suggestionsRequestSchema = z.object({
  messages: z.array(uiMessageSchema),
  model: modelIdSchema,
});

export type SuggestionsRequest = z.infer<typeof suggestionsRequestSchema>;

export const suggestionsResponseSchema = z.object({
  suggestions: z.array(z.string().min(1).max(100)),
});

export type SuggestionsResponse = z.infer<typeof suggestionsResponseSchema>;

// ============================================================================
// Settings Schemas
// ============================================================================

export const settingsUpdateSchema = z.object({
  account: z
    .object({
      email: emailSchema.optional(),
      displayName: z.string().min(2).max(100).optional(),
    })
    .optional(),
  appearance: z
    .object({
      theme: z.enum(["light", "dark", "system"]).optional(),
      density: z.enum(["comfortable", "compact"]).optional(),
    })
    .optional(),
  models: z
    .object({
      defaultModel: modelIdSchema.optional(),
      temperature: z.number().min(0).max(1).optional(),
      apiKey: z.string().optional(),
    })
    .optional(),
  suggestions: z
    .object({
      enabled: z.boolean().optional(),
      model: modelIdSchema.optional(),
    })
    .optional(),
  tools: z.record(z.string(), z.unknown()).optional(),
});

export type SettingsUpdateRequest = z.infer<typeof settingsUpdateSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely parse and validate request body against schema
 * @throws Error if validation fails
 */
export function validateRequestSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Validation error: ${message}`);
    }
    throw error;
  }
}
