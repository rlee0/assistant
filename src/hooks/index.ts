/**
 * Shared React Hooks Module
 *
 * Centralized exports for reusable React hooks that are used across multiple
 * features in the application.
 *
 * @module hooks
 */

// ============================================================================
// State Management Hooks
// ============================================================================
export * from "./use-loading-state";
export * from "./use-optimistic-update";
export * from "./use-optimistic-action";

// ============================================================================
// Async Transition Hooks
// ============================================================================
export * from "./use-async-transition";

// ============================================================================
// Navigation & Progress Hooks
// ============================================================================
export * from "./use-navigation-progress";

// ============================================================================
// UI Feedback Hooks
// ============================================================================
export * from "./use-loading-toast";

// ============================================================================
// Responsive Design Hooks
// ============================================================================
export * from "./use-mobile";

// ============================================================================
// Input & Form Hooks
// ============================================================================
export * from "./use-speech-recognition";
export * from "./use-prompt-input-keyboard";
export * from "./use-prompt-input-paste";
