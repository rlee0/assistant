import { type Tool } from "ai";
import { z } from "zod";
import { createSearchTool } from "./tool";
import { searchSettings } from "./schema";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  settingsSchema: z.ZodSchema;
  build: (settings: unknown) => Tool;
};

const searchToolDef: ToolDefinition = {
  id: "search",
  name: "Search",
  description: "Search the web for information",
  settingsSchema: searchSettings,
  build: createSearchTool as (settings: unknown) => Tool,
};

export default searchToolDef;
export { searchSettings, type SearchSettings } from "./schema";
export { createSearchTool } from "./tool";
