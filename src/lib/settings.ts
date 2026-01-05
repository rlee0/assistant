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
 * Settings schema - single source of truth for all settings structure
 */
export const settingsSchema = z.object({
  account: z.object({
    email: z.string().email(),
    displayName: z.string().min(2),
    password: z.string().min(6).optional(),
  }),
  appearance: z.object({
    theme: z.enum(["light", "dark", "system"]),
    density: z.enum(["comfortable", "compact"]),
  }),
  models: z.object({
    defaultModel: z.string(),
    temperature: z.number().min(0).max(1),
    apiKey: z.string().optional(),
  }),
  tools: z.record(z.string(), z.any()),
});

export type Settings = z.infer<typeof settingsSchema>;

/**
 * Build default settings - driven entirely by constants and schema
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
