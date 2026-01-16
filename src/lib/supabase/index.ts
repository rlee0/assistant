/**
 * Supabase Client Module
 *
 * Centralized exports for Supabase client utilities, including browser and server
 * clients, settings management, and data loaders.
 *
 * @module lib/supabase
 */

// ============================================================================
// Client Factories
// ============================================================================
export * from "./browser-client";
export * from "./server-client";

// ============================================================================
// Data Loaders
// ============================================================================
export * from "./loaders";

// ============================================================================
// Settings Management
// ============================================================================
export * from "./settings";
