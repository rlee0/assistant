/**
 * Chat-related types for Supabase persistence and API operations
 *
 * Note: These types represent persisted chat data structures.
 * For real-time UI state, use the useChat hook from @ai-sdk/react.
 */

import { type ModelMessage } from "ai";

/**
 * A single message in a chat with metadata
 */
export type ChatMessage = ModelMessage & {
  id: string;
  createdAt: string;
};

/**
 * A checkpoint that marks a point in conversation history
 * Allows restoring to previous conversation states
 */
export type ChatCheckpoint = {
  id: string;
  messageIndex: number;
  timestamp: string;
};

/**
 * A persisted chat session
 */
export type ChatSession = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  model: string;
  context?: string;
  suggestions: string[];
  messages: ChatMessage[];
  checkpoints: ChatCheckpoint[];
};
