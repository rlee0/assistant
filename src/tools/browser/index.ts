import { type Tool } from "ai";
import { z } from "zod";
import { createBrowserTool } from "./tool";
import { browserSettings } from "./schema";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  settingsSchema: z.ZodSchema;
  build: (settings: unknown) => Tool;
};

const browserToolDef: ToolDefinition = {
  id: "browser",
  name: "Browser",
  description: "Browse and extract information from web pages",
  settingsSchema: browserSettings,
  build: createBrowserTool as (settings: unknown) => Tool,
};

export default browserToolDef;
export { browserSettings, type BrowserSettings } from "./schema";
export { createBrowserTool } from "./tool";
