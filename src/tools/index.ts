import { z } from "zod";
import { type Tool } from "ai";

/**
 * ToolDefinition describes a tool's configuration and builder function
 * Each tool must define its settings schema and provide a builder function
 * that creates the actual ai-sdk Tool instance with those settings
 */
export type ToolDefinition<T extends z.ZodTypeAny = z.ZodTypeAny> = {
  id: string;
  name: string;
  description: string;
  settingsSchema: T;
  build: (settings: unknown) => Tool;
};

/**
 * Tools are automatically loaded from subdirectories.
 * Each tool folder must contain an index.ts that exports a default ToolDefinition object.
 *
 * To add a new tool:
 * 1. Create a new folder under /src/tools/your-tool-name/
 * 2. Create schema.ts with settings validation schema
 * 3. Create tool.ts with the tool implementation (createYourToolTool function)
 * 4. Create index.ts that exports the default ToolDefinition
 * 5. Add the import and registration below
 *
 * The tool will be automatically discovered and available to the agent.
 */

// Import all registered tools
export { getDateTime } from "./datetime";

export const toolDefinitions: ToolDefinition[] = [];

export type ToolSettingsMap = Record<string, unknown>;

/**
 * Build default settings for all tools
 * Returns a ToolSettingsMap where each key is a tool ID and value is its default settings
 */
export function defaultToolSettings(): ToolSettingsMap {
  return Object.fromEntries(
    toolDefinitions.map((def) => {
      const parseResult = def.settingsSchema.safeParse({});
      const defaultSettings = parseResult.success ? parseResult.data : def.settingsSchema.parse({});
      return [def.id, defaultSettings];
    })
  );
}

/**
 * Build tools from settings
 * Validates settings against each tool's schema and creates Tool instances
 * Filters out disabled tools
 *
 * @param settings - ToolSettingsMap with user-provided settings
 * @returns Record of tool ID to Tool instance, excluding disabled tools
 */
export function buildTools(settings: ToolSettingsMap): Record<string, Tool> {
  const entries = toolDefinitions
    .map((def) => {
      // Validate settings against tool's schema
      const parsed = def.settingsSchema.safeParse(settings[def.id] ?? {});
      const settingsValue = parsed.success ? parsed.data : def.settingsSchema.parse({});

      // Check if tool is enabled (settings may have enabled flag)
      const isEnabled = !(
        typeof settingsValue === "object" &&
        settingsValue !== null &&
        "enabled" in settingsValue &&
        settingsValue.enabled === false
      );

      if (!isEnabled) {
        return null;
      }

      return [def.id, def.build(settingsValue)] as const;
    })
    .filter((entry): entry is [string, Tool] => entry !== null);

  return Object.fromEntries(entries);
}
