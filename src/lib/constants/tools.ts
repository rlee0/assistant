/**
 * Tool Configuration Constants
 *
 * Default settings and limits for AI tools (browser, code runner, search, etc.).
 *
 * @module lib/constants/tools
 */

// ============================================================================
// Browser Tool Defaults
// ============================================================================

/** Enable browser tool by default */
export const BROWSER_DEFAULT_ENABLED = true;

/** Default user agent string for browser requests */
export const BROWSER_DEFAULT_USER_AGENT = "Mozilla/5.0";

/** Default maximum depth for recursive browsing */
export const BROWSER_DEFAULT_MAX_DEPTH = 2;

/** Maximum allowed depth limit for browser tool */
export const BROWSER_MAX_DEPTH_LIMIT = 5;

/** Default timeout for browser requests in milliseconds */
export const BROWSER_DEFAULT_TIMEOUT_MS = 8000;

/** Minimum allowed timeout for browser requests in milliseconds */
export const BROWSER_TIMEOUT_MIN_MS = 1000;

/** Maximum allowed timeout for browser requests in milliseconds */
export const BROWSER_TIMEOUT_MAX_MS = 20000;

// ============================================================================
// Code Runner Tool Defaults
// ============================================================================

/** Enable code runner tool by default */
export const CODE_RUNNER_DEFAULT_ENABLED = true;

/** Default runtime environment for code execution */
export const CODE_RUNNER_DEFAULT_RUNTIME = "nodejs" as const;

/** Default timeout for code execution in milliseconds */
export const CODE_RUNNER_DEFAULT_TIMEOUT_MS = 10000;

/** Minimum allowed timeout for code execution in milliseconds */
export const CODE_RUNNER_TIMEOUT_MIN_MS = 1000;

/** Maximum allowed timeout for code execution in milliseconds */
export const CODE_RUNNER_TIMEOUT_MAX_MS = 20000;

// ============================================================================
// Search Tool Defaults
// ============================================================================

/** Enable search tool by default */
export const SEARCH_DEFAULT_ENABLED = true;

/** Default search provider */
export const SEARCH_DEFAULT_PROVIDER = "duckduckgo" as const;

/** Default region for search results */
export const SEARCH_DEFAULT_REGION = "us";
