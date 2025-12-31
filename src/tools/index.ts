import { z } from "zod";
import { tool, type Tool } from "ai";

export type ToolDefinition<T extends z.ZodTypeAny = z.ZodObject<any>> = {
  id: string;
  name: string;
  description: string;
  settingsSchema: T;
  build: (settings: z.infer<T>) => Tool;
};

const browserSettings = z.object({
  enabled: z.boolean().default(true),
  userAgent: z.string().default("Mozilla/5.0"),
  maxDepth: z.number().int().min(1).max(5).default(2),
  timeoutMs: z.number().int().min(1000).max(20000).default(8000),
});

const codeRunnerSettings = z.object({
  enabled: z.boolean().default(true),
  runtime: z.enum(["nodejs"]).default("nodejs"),
  timeoutMs: z.number().int().min(1000).max(20000).default(10000),
  apiKey: z.string().optional(),
});

const searchSettings = z.object({
  enabled: z.boolean().default(true),
  provider: z.enum(["duckduckgo", "serpapi"]).default("duckduckgo"),
  apiKey: z.string().optional(),
  region: z.string().default("us"),
});

export const toolDefinitions: ToolDefinition[] = [];

export type ToolSettingsMap = Record<string, unknown>;

export function defaultToolSettings(): ToolSettingsMap {
  return Object.fromEntries(toolDefinitions.map((def) => [def.id, def.settingsSchema.parse({})]));
}

export function buildTools(settings: ToolSettingsMap): Record<string, Tool> {
  const entries = toolDefinitions.map((def) => {
    const parsed = def.settingsSchema.safeParse(settings[def.id] ?? {});
    const settingsValue = parsed.success ? parsed.data : def.settingsSchema.parse({});
    if ((settingsValue as { enabled?: boolean }).enabled === false) {
      return null;
    }
    return [def.id, def.build(settingsValue)] as const;
  });
  return Object.fromEntries(entries.filter(Boolean) as Array<[string, Tool]>);
}
