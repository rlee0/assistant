/**
 * Chat UI Constants
 *
 * Centralized constants for chat interface styling, configuration, and message handling.
 * Extracted from chat-client.tsx for better maintainability and reusability.
 */

import { LAYOUT, SPACING, SIZE, TEXT, BORDER, BG, POSITION, ALIGN } from "@/styles/constants";

// ============================================================================
// Checkpoint Configuration
// ============================================================================

/** Maximum number of checkpoints to retain per conversation */
export const MAX_CHECKPOINTS = 10 as const;

// ============================================================================
// Layout & Styling Constants
// ============================================================================

/** Maximum width for chat container */
export const CHAT_CONTAINER_MAX_WIDTH = SIZE.maxW["3xl"];

/** Default provider logo when provider is unknown */
export const DEFAULT_PROVIDER = "openai" as const;

/** Radix UI scroll area viewport selector */
export const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]" as const;

/** Threshold in pixels to determine if user is at bottom of scroll area */
export const SCROLL_ANCHOR_THRESHOLD = 100 as const;

/** CSS class names for chat UI components */
export const CSS_CLASSES = {
  image: `${SIZE.maxW.sm} ${BORDER.rounded.md} h-auto`,
  messagesContainer: `${LAYOUT.flexCol} flex-1 ${SIZE.minH0}`,
  messagesInner: "mx-auto py-8 space-y-6",
  inputContainer: `${POSITION.sticky} ${POSITION.bottom0} ${POSITION.zIndex.z20} ${BG.background} ${SPACING.px4} pb-4`,
  modelButton: `${LAYOUT.flexRow} ${SPACING.gap2} min-w-max ${SPACING.px2}`,
  modelName: `${TEXT.sm} ${TEXT.medium} ${TEXT.truncate}`,
  modelId: `${TEXT.muted} ${TEXT.truncate} ${TEXT.xs}`,
  chatContainer: `${LAYOUT.container} h-svh max-h-svh`,
  header: `${POSITION.sticky} ${POSITION.top0} ${POSITION.zIndex.z20} ${BORDER.b} ${BG.background} ${SPACING.px4} ${SPACING.py3} ${LAYOUT.flexRow} ${SPACING.gap2}`,
  headerTitle: `${TEXT.lg} ${TEXT.semibold}`,
  sidebar: `${LAYOUT.containerFull} ${SPACING.p4}`,
  newChatButton: SPACING.mb4,
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
// Timeout Configuration
// ============================================================================

/** Request timeout for chat API operations (ms) */
export const CHAT_REQUEST_TIMEOUT_MS = 10000 as const;

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
