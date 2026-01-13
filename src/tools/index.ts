/**
 * Tool Registry & Exports
 *
 * To add a new tool:
 * 1. Create a new file under /src/tools/ (e.g., weather.ts)
 * 2. Export a tool factory function: `export const myTool = (options) => tool({...})`
 * 3. Add `export * from "./my-tool";` to the list below
 *
 * Tools are then available throughout the application via:
 * ```
 * import { getLocation, getDateTime, myTool } from "@/tools";
 * ```
 */

// Re-export all tool factory functions
export * from "./datetime";
export * from "./location";

/**
 * Get default settings for all tools
 * Returns empty record as tools don't have configuration settings
 */
export function defaultToolSettings(): Record<string, unknown> {
  return {};
}
