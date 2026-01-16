/**
 * User Settings Constants
 *
 * Default values for user profile and application settings.
 *
 * @module lib/constants/settings
 */

// ============================================================================
// Account Defaults
// ============================================================================

/** Default email for development/placeholder purposes */
export const DEFAULT_USER_EMAIL = "user@example.com";

/** Default display name for new users */
export const DEFAULT_USER_DISPLAY_NAME = "Assistant User";

// ============================================================================
// Appearance Defaults
// ============================================================================

/** Default theme setting (light, dark, or system) */
export const DEFAULT_THEME = "system" as const;

/** Default UI density setting (comfortable or compact) */
export const DEFAULT_DENSITY = "comfortable" as const;
