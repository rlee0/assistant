/**
 * Library Module
 *
 * Core utilities, constants, and shared functionality used throughout the application.
 * This module provides centralized access to common utilities, API helpers, Supabase
 * clients, and application-wide constants.
 *
 * @module lib
 */

// ============================================================================
// Core Utilities
// ============================================================================
export * from "./utils";
export * from "./logging";
export * from "./models";
export * from "./settings";
export { default as environment, getEnv } from "./env";

// ============================================================================
// Constants
// ============================================================================
// Re-export all constants for convenience
// Prefer importing from specific modules: @/lib/constants/{chat|models|settings|tools}
export * from "./constants";

// ============================================================================
// Shared Types
// ============================================================================
export * from "./types";

// ============================================================================
// Submodules (use namespaced imports for these)
// ============================================================================
// Usage:
// import * as api from "@/lib/api"
// import * as supabase from "@/lib/supabase"
// import * as agent from "@/lib/agent"

export * as api from "./api";
export * as supabase from "./supabase";
export * as agent from "./agent";
