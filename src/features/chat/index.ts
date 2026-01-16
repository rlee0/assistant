/**
 * Chat Feature Module Exports
 *
 * This is the primary export point for the chat feature. Re-exports are organized by category:
 * - Main component (ChatClient)
 * - Types (all TypeScript interfaces and types)
 * - UI Components (Chat UI building blocks)
 * - Hooks (React hooks for chat logic)
 * - Utilities (helper functions and handlers)
 * - Error handling (custom error classes)
 * - Tools (AI SDK tool definitions)
 *
 * All exports are marked with `readonly` where applicable to prevent accidental mutations.
 */

// ============================================================================
// Main Component
// ============================================================================
export { ChatClient } from "./components/chat-client";

// ============================================================================
// Types
// ============================================================================
export type {
  ChatClientProps,
  ChatMessage,
  ChatCheckpoint,
  ChatSession,
  SelectedModelInfo,
  UseChatMessage,
  ChatMessagesProps,
  ChatInputProps,
  ChatHeaderProps,
  MessagePartRendererProps,
  SourcesRendererProps,
  UseModelManagementReturn,
  ScrollToBottomCaptureProps,
} from "./types";

// ============================================================================
// UI Components
// ============================================================================
export { ChatHeader } from "./components/chat-header";
export { ChatMessages } from "./components/chat-messages";
export { ChatInput } from "./components/chat-input";
export { ChatSidebar } from "./components/chat-sidebar";
export { MessagePartRenderer, SourcesRenderer } from "./components/message-renderers";

// ============================================================================
// React Hooks
// ============================================================================
export {
  useModelManagement,
  useGroupedModels,
  useTextareaKeyboardShortcuts,
  useAutoFocusTextarea,
} from "./hooks/use-chat-hooks";
export { useConversationManagement } from "./hooks/use-conversation-management";
export { useConversationPersistence } from "./hooks/use-conversation-persistence";
export { useMessageEditing } from "./hooks/use-message-editing";

// ============================================================================
// Utilities - Message Handling
// ============================================================================
export {
  extractTextFromMessage,
  generateTitleFromText,
  mapUseChatStatus,
  uiMessageToChatMessage,
  areMessagesEqual,
  extractTimestamp,
} from "./utils/message-utils";

export {
  extractTextParts,
  extractToolCallParts,
  extractImageParts,
  extractReasoningParts,
  extractSourceUrls,
  joinTextParts,
  isTextPart,
  isToolCallPart,
  isToolResultPart,
  isImagePart,
  isReasoningPart,
  isSourceUrlPart,
  type MessagePart,
} from "./utils/message-parts";

// ============================================================================
// Utilities - API & Storage
// ============================================================================
export {
  persistConversation,
  createConversationRequest,
  deleteConversationRequest,
  type PersistConversationParams,
  type CreateConversationParams,
  type DeleteConversationParams,
} from "./handlers/conversation-handlers";

export {
  findMessageIndex,
  validateMessageExists,
  validateMessageRole,
  extractMessageText,
  validateEditText,
  validateRegenerateMessage,
} from "./handlers/message-handlers";

// ============================================================================
// Utilities - Browser APIs
// ============================================================================
export {
  isClipboardAvailable,
  copyToClipboard,
  readFromClipboard,
  safeCopyToClipboard,
} from "./utils/clipboard";

// ============================================================================
// Error Handling
// ============================================================================
export {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ServerError,
  NetworkError,
  AbortedError,
  isAuthenticationError,
  isAuthorizationError,
  isNotFoundError,
  isNetworkError,
  isAbortedError,
  createErrorFromStatus,
  getErrorMessage,
  isRetryable,
} from "./utils/errors";

// ============================================================================
// AI SDK Tools
// ============================================================================
export { getDateTime } from "./tools/get-date-time";
export { getWeather } from "./tools/get-weather";
