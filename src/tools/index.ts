import { z } from "zod";
import { type Tool } from "ai";
import {
  BROWSER_DEFAULT_ENABLED,
  BROWSER_DEFAULT_USER_AGENT,
  BROWSER_DEFAULT_MAX_DEPTH,
  BROWSER_MAX_DEPTH_LIMIT,
  BROWSER_DEFAULT_TIMEOUT_MS,
  BROWSER_TIMEOUT_MIN_MS,
  BROWSER_TIMEOUT_MAX_MS,
  CODE_RUNNER_DEFAULT_ENABLED,
  CODE_RUNNER_DEFAULT_RUNTIME,
  CODE_RUNNER_DEFAULT_TIMEOUT_MS,
  CODE_RUNNER_TIMEOUT_MIN_MS,
  CODE_RUNNER_TIMEOUT_MAX_MS,
  SEARCH_DEFAULT_ENABLED,
  SEARCH_DEFAULT_PROVIDER,
  SEARCH_DEFAULT_REGION,
} from "@/lib/constants";

export type ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string;
  name: string;
  description: string;
  settingsSchema: T;
  build: (settings: z.infer<T>) => Tool;
};

export const browserSettings = z.object({
  enabled: z.boolean().default(BROWSER_DEFAULT_ENABLED),
  userAgent: z.string().default(BROWSER_DEFAULT_USER_AGENT),
  maxDepth: z.number().int().min(1).max(BROWSER_MAX_DEPTH_LIMIT).default(BROWSER_DEFAULT_MAX_DEPTH),
  timeoutMs: z
    .number()
    .int()
    .min(BROWSER_TIMEOUT_MIN_MS)
    .max(BROWSER_TIMEOUT_MAX_MS)
    .default(BROWSER_DEFAULT_TIMEOUT_MS),
});

export const codeRunnerSettings = z.object({
  enabled: z.boolean().default(CODE_RUNNER_DEFAULT_ENABLED),
  runtime: z.enum(["nodejs"]).default(CODE_RUNNER_DEFAULT_RUNTIME),
  timeoutMs: z
    .number()
    .int()
    .min(CODE_RUNNER_TIMEOUT_MIN_MS)
    .max(CODE_RUNNER_TIMEOUT_MAX_MS)
    .default(CODE_RUNNER_DEFAULT_TIMEOUT_MS),
  apiKey: z.string().optional(),
});

export const searchSettings = z.object({
  enabled: z.boolean().default(SEARCH_DEFAULT_ENABLED),
  provider: z.enum(["duckduckgo", "serpapi"]).default(SEARCH_DEFAULT_PROVIDER),
  apiKey: z.string().optional(),
  region: z.string().default(SEARCH_DEFAULT_REGION),
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
