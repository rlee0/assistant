import { z } from "zod";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  settingsSchema: ReturnType<typeof z.object>;
};

export const browserTool: ToolDefinition = {
  id: "browser",
  name: "Browser Automation",
  description: "Navigate web pages and extract information",
  settingsSchema: z.object({
    enabled: z.boolean().default(true),
    userAgent: z.string().default("Mozilla/5.0"),
    maxDepth: z.number().default(2),
  }),
};

export const codeRunnerTool: ToolDefinition = {
  id: "code-runner",
  name: "Code Runner",
  description: "Execute code snippets in a sandbox",
  settingsSchema: z.object({
    enabled: z.boolean().default(true),
    runtime: z.string().default("nodejs"),
    timeoutMs: z.number().default(10000),
    apiKey: z.string().optional(),
  }),
};

export const searchTool: ToolDefinition = {
  id: "search",
  name: "Search",
  description: "Perform semantic or keyword web search",
  settingsSchema: z.object({
    enabled: z.boolean().default(true),
    provider: z.string().default("serpapi"),
    apiKey: z.string().optional(),
    region: z.string().default("us"),
  }),
};

export const tools: ToolDefinition[] = [browserTool, codeRunnerTool, searchTool];
