import { z } from "zod";
import { tool, type Tool } from "ai";

export type ToolDefinition<T extends z.ZodTypeAny = z.AnyZodObject> = {
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

export const toolDefinitions: ToolDefinition[] = [
  {
    id: "browser",
    name: "Browser Automation",
    description: "Navigate web pages and extract information",
    settingsSchema: browserSettings,
    build: (settings) =>
      tool({
        description: "Fetch a web page and return a concise text snippet.",
        parameters: z.object({
          url: z.string().url(),
        }),
        execute: async ({ url }) => {
          const res = await fetch(url, {
            headers: { "User-Agent": settings.userAgent },
            signal: AbortSignal.timeout(settings.timeoutMs),
          });
          const text = await res.text();
          const snippet = text.slice(0, 1200);
          return `Fetched ${url}. Preview: ${snippet}`;
        },
      }),
  },
  {
    id: "code-runner",
    name: "Code Runner",
    description: "Execute code snippets in a sandbox",
    settingsSchema: codeRunnerSettings,
    build: (settings) =>
      tool({
        description: "Run small JavaScript snippets safely and return output.",
        parameters: z.object({
          code: z.string(),
        }),
        execute: async ({ code }) => {
          if (!settings.enabled) return "Code runner disabled.";
          const fn = new Function(`"use strict"; ${code}`);
          const result = await Promise.race([
            Promise.resolve().then(fn),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), settings.timeoutMs)
            ),
          ]);
          return typeof result === "string" ? result : JSON.stringify(result);
        },
      }),
  },
  {
    id: "search",
    name: "Search",
    description: "Perform semantic or keyword web search",
    settingsSchema: searchSettings,
    build: (settings) =>
      tool({
        description: "Search DuckDuckGo for a query.",
        parameters: z.object({
          query: z.string(),
        }),
        execute: async ({ query }) => {
          const url = new URL("https://api.duckduckgo.com/");
          url.searchParams.set("q", query);
          url.searchParams.set("format", "json");
          const res = await fetch(url.toString(), {
            signal: AbortSignal.timeout(8000),
          });
          const data = (await res.json()) as { AbstractText?: string; RelatedTopics?: Array<{ Text?: string }> };
          const related =
            data.RelatedTopics?.map((t) => t.Text).filter(Boolean).slice(0, 5) ??
            [];
          return `Region: ${settings.region}. Summary: ${
            data.AbstractText ?? "n/a"
          }\nRelated: ${related.join(" | ")}`;
        },
      }),
  },
];

export type ToolSettingsMap = Record<string, unknown>;

export function defaultToolSettings(): ToolSettingsMap {
  return Object.fromEntries(
    toolDefinitions.map((def) => [def.id, def.settingsSchema.parse({})])
  );
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
