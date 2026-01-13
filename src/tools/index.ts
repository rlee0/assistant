/**
 * Tool Registry & Exports
 *
 * To add a new tool:
 * 1. Create a new file under /src/tools/ (e.g., weather.ts)
 * 2. Export a tool factory function: `export const myTool = (options) => tool({...})`
 * 3. Add `export * from "./my-tool";` to the list below
 *
 */

// Re-export all tool factory functions
export * from "./datetime";
export * from "./weather";

/**
 * Get default settings for all tools
 * Returns empty record as tools don't have configuration settings
 */
export function defaultToolSettings(): Record<string, unknown> {
  return {};
}
