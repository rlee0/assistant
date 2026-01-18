/**
 * Settings Page Constants
 *
 * All magic numbers and string literals used in the settings page.
 */

export const PASSWORD_SUCCESS_DISPLAY_DURATION_MS = 5000;

export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export type ThemeValue = (typeof THEME_OPTIONS)[number];

export const CHAT_MODEL_OPTIONS = [
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
] as const;

export const SUGGESTIONS_MODEL_OPTIONS = [
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (Faster)" },
  { value: "openai/gpt-4o", label: "GPT-4o (Better Quality)" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
] as const;

export const TEMPERATURE_CONFIG = {
  MIN: 0,
  MAX: 2,
  STEP: 0.1,
} as const;

export const PASSWORD_CONFIG = {
  MIN_LENGTH: 8,
} as const;

export const ERROR_MESSAGES = {
  LOGOUT_FAILED: "Failed to logout",
  DELETE_ACCOUNT_FAILED: "Failed to delete account",
  ACCOUNT_INFO_LOAD_FAILED: "Failed to load account information. Please refresh the page.",
} as const;

export const SUCCESS_MESSAGES = {
  PASSWORD_UPDATED: "Password updated successfully",
  ACCOUNT_DELETED: "Account deleted successfully",
  LOGGED_OUT: "Logged out successfully",
} as const;
