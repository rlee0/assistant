import { z } from "zod";

/**
 * Settings Schema
 *
 * Defines the complete structure for user settings with validation.
 * All settings are persisted to the server and user-specific.
 */

export const settingsSchema = z.object({
  // Appearance settings
  appearance: z.object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
  }),

  // Chat model settings
  chat: z.object({
    model: z.string().default("openai/gpt-5.2-chat"),
    temperature: z.number().min(0).max(2).default(0.7),
  }),

  // Suggestions settings
  suggestions: z.object({
    enabled: z.boolean().default(true),
    model: z.string().default("openai/gpt-5-nano"),
  }),
});

export type Settings = z.infer<typeof settingsSchema>;

/**
 * Default settings values
 */
export const defaultSettings: Settings = {
  appearance: {
    theme: "system",
  },
  chat: {
    model: "openai/gpt-5.2-chat",
    temperature: 0.7,
  },
  suggestions: {
    enabled: true,
    model: "openai/gpt-5-nano",
  },
};

/**
 * Account information (read-only, sourced from Supabase Auth)
 */
export const accountInfoSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  createdAt: z.string(),
});

export type AccountInfo = z.infer<typeof accountInfoSchema>;

/**
 * Password change request
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type PasswordChangeRequest = z.infer<typeof passwordChangeSchema>;

/**
 * API Response Types
 */
export interface SettingsApiResponse {
  settings: Settings;
  account: AccountInfo;
}

export interface SettingsUpdateResponse {
  success: boolean;
  settings: Settings;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: unknown;
}
