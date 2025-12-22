import { z } from 'zod';

export const UserSettingsSchema = z.object({
  appearance: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    fontSize: z.number().min(12).max(24).default(14),
  }).optional(),
  
  ai: z.object({
    defaultModel: z.string().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().min(100).max(8000).default(2000),
  }).optional(),
  
  chat: z.object({
    autoGenerateTitle: z.boolean().default(true),
    showSuggestions: z.boolean().default(true),
    sidebarCollapsed: z.boolean().default(false),
  }).optional(),
  
  aiGateway: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }).optional(),
  
  tools: z.record(z.string(), z.unknown()).optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const ToolSettingsSchema = z.object({
  apiKey: z.string().optional(),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type ToolSettings = z.infer<typeof ToolSettingsSchema>;
