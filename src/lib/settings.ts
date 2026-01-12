import {
  DEFAULT_DENSITY,
  DEFAULT_MODEL,
  DEFAULT_TEMPERATURE,
  DEFAULT_THEME,
  DEFAULT_USER_DISPLAY_NAME,
  DEFAULT_USER_EMAIL,
} from "@/lib/constants";

import { defaultToolSettings } from "@/tools";
import { z } from "zod";

/**
 * Type-safe theme selection
 */
export const themeSchema = z.enum(["light", "dark", "system"]);
export type Theme = z.infer<typeof themeSchema>;

/**
 * Type-safe density selection
 */
export const densitySchema = z.enum(["comfortable", "compact"]);
export type Density = z.infer<typeof densitySchema>;

/**
 * Settings schema - single source of truth for all settings structure
 * All settings are validated against this schema before storage and access
 */
export const settingsSchema = z.object({
  account: z.object({
    email: z.string().email("Invalid email format").trim().toLowerCase(),
    displayName: z.string().min(2, "Display name must be at least 2 characters"),
    password: z.string().min(8, "Password must be at least 8 characters").optional(),
  }),
  appearance: z.object({
    theme: themeSchema,
    density: densitySchema,
  }),
  models: z.object({
    defaultModel: z.string().min(1, "Default model must be specified"),
    temperature: z.number().min(0, "Temperature must be >= 0").max(1, "Temperature must be <= 1"),
    apiKey: z.string().optional(),
  }),
  tools: z.record(z.string(), z.unknown()),
});

export type Settings = z.infer<typeof settingsSchema>;

/**
 * Build default settings - driven entirely by constants and schema
 * All values are validated against the schema to catch errors early
 */
export function buildDefaultSettings(): Settings {
  return settingsSchema.parse({
    account: {
      email: DEFAULT_USER_EMAIL,
      displayName: DEFAULT_USER_DISPLAY_NAME,
      password: undefined,
    },
    appearance: {
      theme: DEFAULT_THEME,
      density: DEFAULT_DENSITY,
    },
    models: {
      defaultModel: DEFAULT_MODEL,
      temperature: DEFAULT_TEMPERATURE,
      apiKey: "",
    },
    tools: defaultToolSettings(),
  });
}

/**
 * Utility to validate and parse settings from unknown source
 * Useful for loading from database or API
 */
export function parseSettings(input: unknown): Settings {
  return settingsSchema.parse(input);
}
