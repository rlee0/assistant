/**
 * Application-wide constants and default values
 */

// Model defaults
export const DEFAULT_MODEL = "gpt-5.2";
export const DEFAULT_TEMPERATURE = 0.4;

// Default fallback models
export const DEFAULT_FALLBACK_MODELS = [
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "ai-gateway" },
  { id: "gpt-4o", name: "GPT-4o", provider: "ai-gateway" },
] as const;

// Default context for new chats
export const DEFAULT_CHAT_CONTEXT =
  "You are an assistant that helps with coding and research tasks. Keep responses concise and actionable.";

// Default suggestions for new chats
export const DEFAULT_SUGGESTIONS = [
  "Summarize this code change",
  "Draft a follow-up question",
  "Generate test cases",
] as const;

// Chat defaults
export const DEFAULT_CHAT_TITLE = "New chat";
export const INITIAL_SUGGESTIONS = ["Ask a quick question", "Generate an outline"] as const;
export const CONTEXT_SUGGESTIONS_BASE = ["Clarify context", "Adjust model temperature"] as const;
export const NO_CONTEXT_SUGGESTIONS = ["Ask a follow-up", "Request a summary"] as const;
export const SUGGESTION_TRIGGERS = {
  TEST: "Generate test cases",
  CODE: "Show refactor ideas",
  PLAN: "Break into actionable steps",
} as const;

// Default user settings
export const DEFAULT_USER_EMAIL = "user@example.com";
export const DEFAULT_USER_DISPLAY_NAME = "Assistant User";
export const DEFAULT_THEME = "system" as const;
export const DEFAULT_DENSITY = "comfortable" as const;

// Tool defaults - Browser
export const BROWSER_DEFAULT_ENABLED = true;
export const BROWSER_DEFAULT_USER_AGENT = "Mozilla/5.0";
export const BROWSER_DEFAULT_MAX_DEPTH = 2;
export const BROWSER_MAX_DEPTH_LIMIT = 5;
export const BROWSER_DEFAULT_TIMEOUT_MS = 8000;
export const BROWSER_TIMEOUT_MIN_MS = 1000;
export const BROWSER_TIMEOUT_MAX_MS = 20000;

// Tool defaults - Code Runner
export const CODE_RUNNER_DEFAULT_ENABLED = true;
export const CODE_RUNNER_DEFAULT_RUNTIME = "nodejs" as const;
export const CODE_RUNNER_DEFAULT_TIMEOUT_MS = 10000;
export const CODE_RUNNER_TIMEOUT_MIN_MS = 1000;
export const CODE_RUNNER_TIMEOUT_MAX_MS = 20000;

// Tool defaults - Search
export const SEARCH_DEFAULT_ENABLED = true;
export const SEARCH_DEFAULT_PROVIDER = "duckduckgo" as const;
export const SEARCH_DEFAULT_REGION = "us";

// Code block syntax highlighting themes
export const SYNTAX_HIGHLIGHT_LIGHT_THEME = "one-light" as const;
export const SYNTAX_HIGHLIGHT_DARK_THEME = "one-dark-pro" as const;

// Temperature slider defaults
export const TEMPERATURE_STEP = 0.1;
