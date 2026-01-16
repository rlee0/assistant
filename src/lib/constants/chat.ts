/**
 * Chat Feature Constants
 *
 * Default values and configuration specific to chat functionality.
 *
 * @module lib/constants/chat
 */

// ============================================================================
// Chat Defaults
// ============================================================================

/** Default title for new chat conversations */
export const DEFAULT_CHAT_TITLE = "New chat";

/**
 * Default system context/instructions for new chat conversations.
 * Provides guidance on the AI assistant's behavior and response style.
 */
export const DEFAULT_CHAT_CONTEXT =
  "You are an assistant that helps with coding and research tasks. Keep responses concise and actionable.";

// ============================================================================
// Suggestion Constants
// ============================================================================

/**
 * Default suggestions shown to users for starting conversations.
 * These appear when no context is available.
 */
export const DEFAULT_SUGGESTIONS = [
  "Summarize this code change",
  "Draft a follow-up question",
  "Generate test cases",
] as const;

/** Initial suggestions for brand new conversations */
export const INITIAL_SUGGESTIONS = ["Ask a quick question", "Generate an outline"] as const;

/** Context-aware suggestions that adjust to conversation state */
export const CONTEXT_SUGGESTIONS_BASE = ["Clarify context", "Adjust model temperature"] as const;

/** Suggestions when no context is available in the conversation */
export const NO_CONTEXT_SUGGESTIONS = ["Ask a follow-up", "Request a summary"] as const;

/**
 * Keyword triggers that determine which suggestions to show.
 * Maps user intent to relevant suggestion prompts.
 */
export const SUGGESTION_TRIGGERS = {
  TEST: "Generate test cases",
  CODE: "Show refactor ideas",
  PLAN: "Break into actionable steps",
} as const;
