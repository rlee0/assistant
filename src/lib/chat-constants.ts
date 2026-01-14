/**
 * Chat UI Constants
 *
 * Centralized constants for chat interface styling, configuration, and message handling.
 * Extracted from chat-client.tsx for better maintainability and reusability.
 */

// ============================================================================
// Layout & Styling Constants
// ============================================================================

/** Maximum width for chat container */
export const CHAT_CONTAINER_MAX_WIDTH = "max-w-3xl" as const;

/** Default provider logo when provider is unknown */
export const DEFAULT_PROVIDER = "openai" as const;

/** Radix UI scroll area viewport selector */
export const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]" as const;

/** Threshold in pixels to determine if user is at bottom of scroll area */
export const SCROLL_ANCHOR_THRESHOLD = 100 as const;

/** CSS class names for chat UI components */
export const CSS_CLASSES = {
  image: "max-w-sm rounded-md h-auto",
  messagesContainer: "flex-1 min-h-0",
  messagesInner: "mx-auto py-8 space-y-6",
  inputContainer: "sticky bottom-0 z-20 border-t bg-background p-4",
  modelButton: "flex items-center gap-2",
  modelName: "text-xs",
  modelId: "text-muted-foreground truncate text-xs",
  chatContainer: "flex h-svh max-h-svh flex-col",
  header: "sticky top-0 z-20 border-b bg-background px-4 py-3 flex items-center gap-2",
  headerTitle: "text-lg font-semibold",
  sidebar: "flex h-full flex-col p-4",
  newChatButton: "mb-4",
} as const;

// ============================================================================
// Message Part Type Constants
// ============================================================================

/**
 * Message part type constants from AI SDK.
 * Used for type-safe message part filtering and rendering.
 */
export const MESSAGE_PART_TYPE = {
  TEXT: "text",
  REASONING: "reasoning",
  SOURCE_URL: "source-url",
  FILE: "file",
} as const;

// ============================================================================
// Message Configuration
// ============================================================================

/** Fallback text when message has only attachments */
export const ATTACHMENT_ONLY_MESSAGE_TEXT = "Sent with attachments" as const;

/** Minimum width for edit input (384px) */
export const EDIT_INPUT_MIN_WIDTH = "min-w-96" as const;

/** Placeholder text for edit textarea */
export const EDIT_PLACEHOLDER = "Edit your message..." as const;

// ============================================================================
// Toast Messages
// ============================================================================

/** Toast notification messages for user feedback */
export const TOAST_MESSAGES = {
  COPY_SUCCESS: "Response copied to clipboard",
  COPY_ERROR: "Failed to copy response",
  MESSAGE_DELETED: "Message deleted",
  MESSAGE_UPDATED: "Message updated and re-submitted",
  MESSAGE_EMPTY: "Message cannot be empty",
} as const;
