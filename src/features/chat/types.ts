/**
 * Chat-related types for Supabase persistence and API operations
 *
 * Note: These types represent persisted chat data structures.
 * For real-time UI state, use the useChat hook from @ai-sdk/react.
 */

import type { LanguageModelUsage, UIMessage } from "ai";

import type { Model } from "@/lib/models";
import type { useChat } from "@ai-sdk/react";

/**
 * Valid chat message roles
 */
export const VALID_MESSAGE_ROLES = ["user", "assistant", "system"] as const;
export type MessageRole = (typeof VALID_MESSAGE_ROLES)[number];

/**
 * Validate that a string is a valid message role
 */
export function isValidMessageRole(value: unknown): value is MessageRole {
  return typeof value === "string" && VALID_MESSAGE_ROLES.includes(value as MessageRole);
}

/**
 * A single message in a chat with metadata
 */
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string; // JSON-serialized message parts or plain text
  createdAt: string;
}

/**
 * Validate message parts array
 */
export function isValidMessageParts(value: unknown): value is UIMessage["parts"] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (part): part is UIMessage["parts"][number] =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      typeof (part as Record<string, unknown>).type === "string"
  );
}

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

/**
 * Client-side conversation (UI representation)
 */
export interface Conversation {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  lastUserMessageAt: string;
  model: string;
  context?: string;
  suggestions: string[];
  messages: UIMessage[];
  checkpoints: ChatCheckpoint[];
}

/**
 * Type alias for useChat messages
 * This is the runtime type of individual messages from the useChat hook
 */
export type UseChatMessage = ReturnType<typeof useChat>["messages"][number];

/**
 * Initial data passed from server to client
 */
export interface InitialChatData {
  readonly chats: Record<string, ChatSession>;
  readonly order: string[];
  readonly selectedId?: string | undefined;
  readonly userId?: string | undefined;
}

/**
 * Selected model information for display
 */
export interface SelectedModelInfo {
  readonly name: string;
  readonly provider: string;
}

/**
 * Props for the main ChatClient component
 */
export type ChatClientProps = {
  readonly initialData: InitialChatData;
  readonly conversationId?: string;
};

/**
 * Props for ChatMessages component
 */
export interface ChatMessagesProps {
  readonly messages: UseChatMessage[];
  readonly status: ReturnType<typeof useChat>["status"];
  readonly error: ReturnType<typeof useChat>["error"];
  readonly messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  readonly editingMessageId: string | null;
  readonly editText: string;
  readonly hydrated: boolean;
  readonly scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  readonly checkpoints: ChatCheckpoint[];
  readonly selectedId: string | null;
  readonly suggestions: string[];
  readonly onNewChat: () => void;
  readonly onEditMessage: (messageId: string, initialText: string) => void;
  readonly onCancelEdit: () => void;
  readonly onSaveEdit: (messageId: string, newText: string) => void;
  readonly onDeleteMessage: (messageId: string) => void;
  readonly onEditTextChange: (text: string) => void;
  readonly onRegenerateFromMessage: (messageId: string) => void;
  readonly onRestoreCheckpoint: (checkpointId: string) => void;
  readonly onSuggestionClick: (suggestion: string) => void;
}

/**
 * Props for MessagePartRenderer component
 */
export interface MessagePartRendererProps {
  readonly part: UseChatMessage["parts"][number];
  readonly index: number;
  readonly isStreaming?: boolean;
}

/**
 * Props for SourcesRenderer component
 */
export interface SourcesRendererProps {
  readonly parts: unknown[];
}

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly onSubmit: (message: Record<string, unknown>) => void | Promise<void>;
  readonly onStop: () => void;
  readonly status: ReturnType<typeof useChat>["status"];
  readonly selectedModelInfo: SelectedModelInfo;
  readonly currentModel: string;
  readonly selectorOpen: boolean;
  readonly onSelectorOpenChange: (open: boolean) => void;
  readonly models: ReadonlyArray<Model>;
  readonly modelsLoading: boolean;
  readonly onModelSelect: (modelId: string) => void;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  readonly totalUsedTokens: number;
  readonly totalUsage: LanguageModelUsage;
  readonly suggestions: readonly string[];
  readonly onSuggestionClick: (suggestion: string) => void;
  readonly editingMessageId: string | null;
}

/**
 * Props for ChatHeader component
 */
export interface ChatHeaderProps {
  readonly conversationTitle: string;
  readonly lastMessageLabel: string;
}

/**
 * Props for ScrollToBottomCapture component
 */
export interface ScrollToBottomCaptureProps {
  readonly scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
}

/**
 * Model management hook return type
 */
export interface UseModelManagementReturn {
  models: Model[];
  selectedModelInfo: SelectedModelInfo;
  modelsLoading: boolean;
}
