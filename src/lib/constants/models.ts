/**
 * Model Configuration Constants
 *
 * Default values and configuration for AI models and their parameters.
 *
 * @module lib/constants/models
 */

// ============================================================================
// Model Defaults
// ============================================================================

/** Default AI model to use for new conversations */
export const DEFAULT_MODEL = "gpt-5.2";

/** Default temperature setting for model responses (0-1 scale) */
export const DEFAULT_TEMPERATURE = 0.4;

/** Step increment for temperature slider adjustments */
export const TEMPERATURE_STEP = 0.1;

// ============================================================================
// Fallback Models
// ============================================================================

/**
 * Fallback models to use when the default model is unavailable.
 * These models are guaranteed to be available via AI Gateway.
 */
export const DEFAULT_FALLBACK_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "ai-gateway" },
  { id: "gpt-4o", name: "GPT-4o", provider: "ai-gateway" },
] as const;

// ============================================================================
// Syntax Highlighting
// ============================================================================

/** Light theme for code block syntax highlighting (using Shiki) */
export const SYNTAX_HIGHLIGHT_LIGHT_THEME = "one-light" as const;

/** Dark theme for code block syntax highlighting (using Shiki) */
export const SYNTAX_HIGHLIGHT_DARK_THEME = "one-dark-pro" as const;
