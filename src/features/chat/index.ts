// Main export
export { ChatClient } from "./components/chat-client";

// Types
export type {
  ChatClientProps,
  SelectedModelInfo,
  UseChatMessage,
  ChatMessagesProps,
  ChatInputProps,
  ChatHeaderProps,
  MessagePartRendererProps,
  SourcesRendererProps,
  UseModelManagementReturn,
} from "./types";

// Components
export { ChatHeader } from "./components/chat-header";
export { ChatMessages } from "./components/chat-messages";
export { ChatInput } from "./components/chat-input";
export { MessagePartRenderer, SourcesRenderer } from "./components/message-renderers";

// Hooks
export {
  useModelManagement,
  useGroupedModels,
  useTextareaKeyboardShortcuts,
  useAutoFocusTextarea,
} from "./hooks/use-chat-hooks";
export { useConversationManagement } from "./hooks/use-conversation-management";
export { useMessageEditing } from "./hooks/use-message-editing";

// Message utilities
export {
  extractTextFromMessage,
  generateTitleFromText,
  mapUseChatStatus,
  uiMessageToChatMessage,
  areMessagesEqual,
  extractTimestamp,
} from "./utils/message-utils";

// Message parts (type-safe utilities)
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

// Error handling
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

// Clipboard utilities
export {
  isClipboardAvailable,
  copyToClipboard,
  readFromClipboard,
  safeCopyToClipboard,
} from "./utils/clipboard";

// Conversation handlers
export {
  persistConversation,
  createConversationRequest,
  deleteConversationRequest,
  type PersistConversationParams,
  type CreateConversationParams,
  type DeleteConversationParams,
} from "./handlers/conversation-handlers";

// Message handlers
export {
  findMessageIndex,
  validateMessageExists,
  validateMessageRole,
  extractMessageText,
  validateEditText,
  validateRegenerateMessage,
} from "./handlers/message-handlers";
