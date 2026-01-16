/**
 * Application Constants Module
 *
 * Centralized re-export of all application constants organized by domain.
 * Import from specific modules for better tree-shaking and clarity:
 *
 * @example
 * ```typescript
 * // Preferred: Import from specific modules
 * import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/constants/models';
 * import { DEFAULT_CHAT_TITLE } from '@/lib/constants/chat';
 * import { DEFAULT_THEME } from '@/lib/constants/settings';
 * import { BROWSER_DEFAULT_ENABLED } from '@/lib/constants/tools';
 *
 * // Also supported: Import from index (all constants)
 * import { DEFAULT_MODEL, DEFAULT_CHAT_TITLE } from '@/lib/constants';
 * ```
 *
 * @module lib/constants
 */

// ============================================================================
// Re-export all constants from organized modules
// ============================================================================

export * from "./chat";
export * from "./models";
export * from "./settings";
export * from "./tools";
