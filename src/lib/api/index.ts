/**
 * API Utilities Module
 *
 * Centralized exports for API-related utilities, error handling, validation,
 * and middleware functions.
 *
 * @module lib/api
 */

// ============================================================================
// Error Handling
// ============================================================================
export * from "./errors";

// ============================================================================
// Validation
// ============================================================================
export * from "./validation";
export * from "./validators";

// ============================================================================
// Middleware & Request Handling
// ============================================================================
export { type AuthenticatedRequest, authenticateRequest, parseRequestBody } from "./middleware";

// ============================================================================
// Response Types (Result pattern)
// ============================================================================
export { type Result, Ok, Err, tryAsync } from "./result";

// ============================================================================
// Route Definitions
// ============================================================================
export * from "./routes";

// ============================================================================
// Revalidation Utilities
// ============================================================================
export * from "./revalidation";
