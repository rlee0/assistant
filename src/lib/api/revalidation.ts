/**
 * Cache Revalidation Utilities for Next.js 16+
 *
 * This module provides helpers for implementing tag-based revalidation strategies
 * instead of blanket `no-store` directives. Using tags allows selective cache
 * invalidation when specific data changes.
 *
 * Recommended usage:
 * - Use `revalidate: 60` for relatively static data (models list, static settings)
 * - Use `revalidate: false` (no-store) for truly dynamic user-specific data
 * - Use tags for intelligent invalidation on mutations
 */

import { revalidateTag } from "next/cache";

/**
 * Cache tags for different data types
 * Use these when fetching data to enable selective revalidation
 */
export const CacheTags = {
  // User chat data - invalidate when chat is created, updated, or deleted
  CHATS: "chats",
  CHAT_MESSAGES: "chat-messages",
  CHAT_CHECKPOINTS: "chat-checkpoints",

  // User settings - invalidate when settings change
  USER_SETTINGS: "user-settings",

  // AI models list - invalidate when available models change (rarely)
  // Consider using ISR (revalidate: 3600) for this instead
  MODELS: "models",

  // User session/auth - typically not cached, but useful if implementing
  USER_SESSION: "user-session",
} as const;

export type CacheTag = (typeof CacheTags)[keyof typeof CacheTags];

/**
 * Revalidate chats after create/update/delete operations
 * Call this in mutations that affect chat data
 */
export function revalidateChats(): void {
  revalidateTag(CacheTags.CHATS, "chats");
  revalidateTag(CacheTags.CHAT_MESSAGES, "chats");
  revalidateTag(CacheTags.CHAT_CHECKPOINTS, "chats");
}

/**
 * Revalidate only messages (e.g., after new message added)
 */
export function revalidateChatMessages(): void {
  revalidateTag(CacheTags.CHAT_MESSAGES, "chats");
}

/**
 * Revalidate checkpoints after save
 */
export function revalidateCheckpoints(): void {
  revalidateTag(CacheTags.CHAT_CHECKPOINTS, "chats");
}

/**
 * Revalidate user settings after update
 */
export function revalidateSettings(): void {
  revalidateTag(CacheTags.USER_SETTINGS, "settings");
}

/**
 * Revalidate models list (rarely needed)
 */
export function revalidateModels(): void {
  revalidateTag(CacheTags.MODELS, "models");
}

/**
 * Recommended caching strategies:
 *
 * 1. **Models List** - Semi-static, can use ISR
 *    fetch(url, {
 *      next: { revalidate: 3600, tags: [CacheTags.MODELS] }
 *    })
 *
 * 2. **User Settings** - Dynamic per user, use debounced sync
 *    fetch(url, {
 *      next: { revalidate: false, tags: [CacheTags.USER_SETTINGS] }
 *    })
 *
 * 3. **Chat Data** - User-specific, truly dynamic
 *    fetch(url, {
 *      next: { revalidate: false, tags: [CacheTags.CHATS, CacheTags.CHAT_MESSAGES] }
 *    })
 *
 * Then after mutations (POST/PUT/DELETE), call the corresponding
 * revalidate* function to clear the cache selectively.
 */
