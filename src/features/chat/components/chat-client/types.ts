import type { ChatCheckpoint } from "@/features/chat/types";
import type { InitialChatData } from "@/lib/supabase/loaders";
import type { LanguageModelUsage } from "ai";
import type { Model } from "@/lib/models";
import type { useChat } from "@ai-sdk/react";

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
 * Type alias for useChat messages
 */
export type UseChatMessage = ReturnType<typeof useChat>["messages"][number];

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
  readonly onNewChat: () => void;
  readonly onEditMessage: (messageId: string, initialText: string) => void;
  readonly onCancelEdit: () => void;
  readonly onSaveEdit: (messageId: string, newText: string) => void;
  readonly onDeleteMessage: (messageId: string) => void;
  readonly onEditTextChange: (text: string) => void;
  readonly onRegenerateFromMessage: (messageId: string) => void;
  readonly onRestoreCheckpoint: (checkpointId: string) => void;
}

/**
 * Props for ChatInput component
 */
export interface ChatInputProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly onSubmit: (message: Record<string, unknown>) => void | Promise<void>;
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
}

/**
 * Props for MessagePartRenderer component
 */
export interface MessagePartRendererProps {
  readonly part: UseChatMessage["parts"][number];
  readonly index: number;
}

/**
 * Props for SourcesRenderer component
 */
export interface SourcesRendererProps {
  readonly parts: UseChatMessage["parts"];
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
