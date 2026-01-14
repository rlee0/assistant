"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type UIMessage } from "ai";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
  type KeyboardEvent,
  useId,
} from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import {
  Message,
  MessageContent,
  MessageActions,
  MessageResponse,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Loader } from "@/components/ai-elements/loader";
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/ai-elements/reasoning";
import { Sources, SourcesTrigger, SourcesContent, Source } from "@/components/ai-elements/sources";
import {
  PromptInput,
  PromptInputHeader,
  PromptInputAttachments,
  PromptInputAttachment,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputButton,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "@/components/ai-elements/model-selector";
import {
  fetchModels,
  getModelProvider,
  formatProviderName,
  groupModelsByProvider,
  type Model,
} from "@/lib/models";
import {
  PlusIcon,
  Check,
  AlertCircle,
  Copy,
  RefreshCcw,
  Edit2,
  Trash2,
  Loader2,
  X,
  LogOut,
  Settings,
} from "lucide-react";
import { SettingsModal } from "@/components/settings-modal";
import { useSettingsStore } from "@/store/settings-store";
import {
  useChatStore,
  chatSessionToConversation,
  type ConversationStatus,
  type Conversation,
} from "@/store/chat-store";
import { useSettingsSync } from "@/hooks/use-settings-sync";
import { useLogout } from "@/hooks/use-logout";
import { logError, logWarn, logDebug } from "@/lib/logging";
import { cn } from "@/lib/utils";
import { type InitialChatData } from "@/lib/supabase/loaders";
import { type ChatMessage } from "@/types/chat";
import {
  CHAT_CONTAINER_MAX_WIDTH,
  DEFAULT_PROVIDER,
  SCROLL_AREA_VIEWPORT_SELECTOR,
  SCROLL_ANCHOR_THRESHOLD,
  CSS_CLASSES,
  MESSAGE_PART_TYPE,
  ATTACHMENT_ONLY_MESSAGE_TEXT,
  EDIT_INPUT_MIN_WIDTH,
  EDIT_PLACEHOLDER,
  TOAST_MESSAGES,
} from "@/lib/chat-constants";

// ============================================================================
// Types
// ============================================================================

interface SelectedModelInfo {
  readonly name: string;
  readonly provider: string;
}

type ChatClientProps = {
  readonly initialData: InitialChatData;
};

type UseChatMessage = ReturnType<typeof useChat>["messages"][number];

function extractTextFromMessage(message: UseChatMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === MESSAGE_PART_TYPE.TEXT)
      .map((part) => part.text)
      .join("\n")
      .trim() ?? ""
  );
}

function generateTitleFromText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";
  const maxLength = 64;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized;
}

function mapUseChatStatus(status: ReturnType<typeof useChat>["status"]): ConversationStatus {
  if (status === "streaming") return "streaming";
  if (status === "submitted") return "loading";
  if (status === "error") return "error";
  return "idle";
}

function uiMessageToChatMessage(message: UseChatMessage): ChatMessage {
  const createdAt = (message as { createdAt?: string }).createdAt ?? new Date().toISOString();

  return {
    id: message.id,
    role: message.role,
    content: extractTextFromMessage(message),
    createdAt,
  };
}

interface ConversationListProps {
  order: string[];
  conversations: Record<string, Conversation>;
  statuses: Record<string, ConversationStatus>;
  selectedId: string | null;
  deleting: Record<string, boolean>;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function renderStatusBadge(status: ConversationStatus) {
  if (status === "idle") return null;
  if (status === "error") {
    return (
      <Badge variant="destructive" className="h-5 gap-1 px-2 text-[11px]">
        <AlertCircle className="size-3" />
        Error
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="h-5 gap-1 px-2 text-[11px]">
      <Loader2 className="size-3 animate-spin" />
      {status === "streaming" ? "Streaming" : "Sending"}
    </Badge>
  );
}

const ConversationList = memo<ConversationListProps>(
  ({ order, conversations, statuses, selectedId, deleting, onSelect, onDelete }) => {
    if (order.length === 0) {
      return (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Conversations</SidebarGroupLabel>
            <SidebarGroupContent>
              <p className="text-xs text-muted-foreground px-2 py-1">No conversations yet.</p>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      );
    }

    return (
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {order.map((id) => {
                const conversation = conversations[id];
                if (!conversation) return null;
                const status = statuses[id] ?? "idle";
                const title = conversation.title || "Untitled chat";

                return (
                  <SidebarMenuItem key={id} className="group/menu-item">
                    <SidebarMenuButton
                      isActive={id === selectedId}
                      onClick={() => onSelect(id)}
                      aria-label={`Open conversation ${title}`}>
                      <span className="flex-1 truncate">{title}</span>
                      {renderStatusBadge(status)}
                    </SidebarMenuButton>
                    <SidebarMenuAction asChild>
                      <button
                        type="button"
                        aria-label={`Delete ${title}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(id);
                        }}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                        disabled={Boolean(deleting[id])}>
                        {deleting[id] ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </button>
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    );
  }
);
ConversationList.displayName = "ConversationList";

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Internal component that uses PromptInput attachment hook.
 * Must be rendered within PromptInput context.
 *
 * Note: Not memoized as it's a trivial component with minimal render cost.
 */
function AttachmentHeaderInner() {
  const attachments = usePromptInputAttachments();

  if (!attachments.files.length) {
    return null;
  }

  return (
    <PromptInputHeader>
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
    </PromptInputHeader>
  );
}

/**
 * Renders a message part based on its type with exhaustive type checking
 */
const MessagePartRenderer = memo<{
  part: ReturnType<typeof useChat>["messages"][number]["parts"][number];
  index: number;
}>(({ part, index }) => {
  // Text content
  if (part.type === MESSAGE_PART_TYPE.TEXT) {
    return <MessageResponse key={index}>{part.text}</MessageResponse>;
  }

  // Reasoning/thinking content
  if (part.type === MESSAGE_PART_TYPE.REASONING) {
    return (
      <Reasoning key={index} defaultOpen={true}>
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  // Tool calls with proper type checking using AI SDK type guards
  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    const shouldDefaultOpen = part.state === "output-available" || part.state === "output-error";

    return (
      <Tool key={index} defaultOpen={shouldDefaultOpen}>
        <ToolHeader type={part.type} state={part.state} title={toolName} />
        <ToolContent>
          <ToolInput input={part.input} />
          <ToolOutput output={part.output} errorText={part.errorText} />
        </ToolContent>
      </Tool>
    );
  }

  // Image files with runtime validation
  if (part.type === MESSAGE_PART_TYPE.FILE && part.mediaType?.startsWith("image/")) {
    return (
      <Image
        key={index}
        src={part.url}
        alt={part.filename || "Uploaded image"}
        width={384}
        height={384}
        className={CSS_CLASSES.image}
        unoptimized={part.url.startsWith("data:")}
      />
    );
  }

  // Source URLs are handled by SourcesRenderer, not individually
  // Unsupported or unknown part types
  return null;
});
MessagePartRenderer.displayName = "MessagePartRenderer";

/**
 * Groups and renders source-url parts using the Sources component
 */
const SourcesRenderer = memo<{
  parts: ReturnType<typeof useChat>["messages"][number]["parts"];
}>(({ parts }) => {
  const sources = parts.filter((part) => part.type === MESSAGE_PART_TYPE.SOURCE_URL);

  if (sources.length === 0) return null;

  return (
    <Sources>
      <SourcesTrigger count={sources.length} />
      <SourcesContent>
        {sources.map((source, index) => (
          <Source key={index} href={source.url} title={source.title ?? source.url} />
        ))}
      </SourcesContent>
    </Sources>
  );
});
SourcesRenderer.displayName = "SourcesRenderer";

// ============================================================================
// Hooks
// ============================================================================

/**
 * Manages model selection and fetching with validation
 * Fetches models once on mount and validates current selection against available models
 *
 * Features:
 * - Atomic cleanup using AbortController to prevent memory leaks and race conditions
 * - Validates model only once to prevent infinite loops
 * - Gracefully handles errors without throwing
 *
 * @throws Does not throw; gracefully handles errors with fallback
 */
function useModelManagement(
  currentModel: string,
  onModelUpdate: (modelId: string) => void
): {
  models: Model[];
  selectedModelInfo: SelectedModelInfo;
} {
  const [models, setModels] = useState<Model[]>([]);
  const onModelUpdateRef = useRef(onModelUpdate);
  const hasValidatedRef = useRef(false);

  // Keep callback ref updated
  useEffect(() => {
    onModelUpdateRef.current = onModelUpdate;
  }, [onModelUpdate]);

  useEffect(() => {
    const controller = new AbortController();

    const loadModels = async () => {
      try {
        const list = await fetchModels();

        // Single atomic check for abort
        if (controller.signal.aborted) return;

        setModels(list);

        // Validate selected model is available (only once)
        if (
          !hasValidatedRef.current &&
          list.length > 0 &&
          !list.some((m) => m.id === currentModel)
        ) {
          hasValidatedRef.current = true;
          onModelUpdateRef.current(list[0].id);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        logError("[Chat]", "Model loading error", err);
      }
    };

    void loadModels();

    return () => {
      controller.abort();
    };
  }, [currentModel]);

  const selectedModelInfo = useMemo<SelectedModelInfo>(() => {
    const selected = models.find((m) => m.id === currentModel);
    return {
      name: selected?.name ?? currentModel,
      provider: selected ? getModelProvider(selected) : DEFAULT_PROVIDER,
    };
  }, [models, currentModel]);

  return { models, selectedModelInfo };
}

/**
 * Memoizes grouped models by provider.
 * Prevents unnecessary re-grouping on every render.
 *
 * @param models - Array of available AI models
 * @returns Models grouped by provider name
 *
 * @example
 * ```ts
 * const groupedModels = useGroupedModels(models);
 * // { openai: [...], anthropic: [...] }
 * ```
 */
function useGroupedModels(models: ReadonlyArray<Model>): ReturnType<typeof groupModelsByProvider> {
  return useMemo(() => groupModelsByProvider(models), [models]);
}

/**
 * Handles keyboard shortcuts in textarea.
 *
 * @returns Stable callback reference for textarea keydown events
 *
 * @remarks
 * - Enter (without modifiers): Submit form
 * - Shift+Enter, Ctrl+Enter, Cmd+Enter: Insert newline
 *
 * The callback reference is stable across re-renders to prevent
 * unnecessary re-renders of the textarea component.
 *
 * @example
 * ```tsx
 * const handleKeyDown = useTextareaKeyboardShortcuts();
 * <textarea onKeyDown={handleKeyDown} />
 * ```
 */
function useTextareaKeyboardShortcuts(): (e: KeyboardEvent<HTMLTextAreaElement>) => void {
  return useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const form = e.currentTarget.form;
      form?.requestSubmit();
    }
  }, []);
}

/**
 * Auto-scrolls to bottom when messages change, with scroll anchor preservation.
 *
 * @param messagesContainerRef - Ref to the messages container div (not ScrollArea)
 * @param messages - Current message array from useChat
 *
 * @remarks
 * - Only scrolls if user is already near the bottom (within SCROLL_ANCHOR_THRESHOLD)
 * - Uses `scrollTo` with smooth behavior for better UX
 * - Preserves scroll position when user has manually scrolled up
 * - Finds scroll viewport element within container to avoid Radix UI ref composition issues
 */
function useAutoScroll(
  messagesContainerRef: React.RefObject<HTMLDivElement | null>,
  messages: ReadonlyArray<ReturnType<typeof useChat>["messages"][number]>
): void {
  const isAtBottomRef = useRef(true); // Start assuming user is at bottom
  const scrollListenerRef = useRef<(() => void) | null>(null);

  // Setup scroll listener once on mount (stable)
  useEffect(() => {
    const containerElement = messagesContainerRef.current;
    if (!containerElement) return;

    // Find the scroll viewport element within the container
    const scrollElement = containerElement.querySelector(SCROLL_AREA_VIEWPORT_SELECTOR);
    if (!(scrollElement instanceof HTMLElement)) return;

    // Check if user is near bottom
    const checkScrollPosition = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isAtBottomRef.current = distanceFromBottom <= SCROLL_ANCHOR_THRESHOLD;
    };

    // Store listener in ref for cleanup
    scrollListenerRef.current = checkScrollPosition;

    // Initial check
    checkScrollPosition();

    // Listen to scroll events
    scrollElement.addEventListener("scroll", checkScrollPosition, { passive: true });

    return () => {
      scrollElement.removeEventListener("scroll", checkScrollPosition);
      scrollListenerRef.current = null;
    };
  }, []); // Empty deps - setup once on mount

  // Scroll when messages change (only if user is at bottom)
  useEffect(() => {
    const containerElement = messagesContainerRef.current;
    if (!containerElement) return;

    // Find the scroll viewport element within the container
    const scrollElement = containerElement.querySelector(SCROLL_AREA_VIEWPORT_SELECTOR);
    if (!(scrollElement instanceof HTMLElement)) return;

    if (isAtBottomRef.current) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]); // Only depend on message count, not the entire messages array
}

/**
 * Auto-focuses textarea on component mount (after hydration).
 *
 * @param textareaRef - Ref to the textarea element
 *
 * @remarks
 * Improves UX by allowing users to start typing immediately.
 * Uses a flag to skip focus on initial hydration render.
 */
function useAutoFocusTextarea(textareaRef: React.RefObject<HTMLTextAreaElement | null>): void {
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    // Only focus after initial mount (skip hydration)
    textareaRef.current?.focus();
  }, [textareaRef]);
}

// ============================================================================
// Sub-Components (Complex)
// ============================================================================

interface ChatMessagesProps {
  messages: ReturnType<typeof useChat>["messages"];
  status: ReturnType<typeof useChat>["status"];
  error: ReturnType<typeof useChat>["error"];
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  editingMessageId: string | null;
  editText: string;
  onEditMessage: (messageId: string, initialText: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, newText: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onEditTextChange: (text: string) => void;
  onRegenerateFromMessage: (messageId: string) => void;
}

const ChatMessages = memo<ChatMessagesProps>(
  ({
    messages,
    status,
    error,
    messagesContainerRef,
    editingMessageId,
    editText,
    onEditMessage,
    onCancelEdit,
    onSaveEdit,
    onDeleteMessage,
    onEditTextChange,
    onRegenerateFromMessage,
  }) => {
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea and set cursor to end when entering edit mode
    useEffect(() => {
      if (editingMessageId && editTextareaRef.current) {
        const textarea = editTextareaRef.current;
        // Use queueMicrotask to ensure DOM update after state change
        queueMicrotask(() => {
          textarea.focus();
          // Set cursor to end of text
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
      }
    }, [editingMessageId, editText]);

    return (
      <div className={CSS_CLASSES.messagesContainer} ref={messagesContainerRef}>
        <ScrollArea className="h-full px-4">
          <div className={cn(CSS_CLASSES.messagesInner, CHAT_CONTAINER_MAX_WIDTH)}>
            {messages.length === 0 && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Start a Conversation</EmptyTitle>
                  <EmptyDescription>Type a message below to begin chatting.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {messages.map((message, messageIndex) => {
              const isEditing = message.id === editingMessageId;
              const isAfterEditedMessage =
                editingMessageId &&
                messageIndex > messages.findIndex((m) => m.id === editingMessageId);
              // const isLastMessage = messageIndex === messages.length - 1;

              // Extract text content for copy and edit functionality
              const textParts = message.parts
                .filter((part) => part.type === MESSAGE_PART_TYPE.TEXT)
                .map((part) => part.text)
                .join("\n");

              const hasTextToCopy = textParts.trim().length > 0;

              return (
                <Message
                  key={message.id}
                  from={message.role}
                  className={isAfterEditedMessage ? "opacity-50 transition-opacity" : ""}>
                  <MessageContent>
                    {isEditing && message.role === "user" ? (
                      <PromptInput
                        onSubmit={() => {
                          if (editText.trim()) {
                            onSaveEdit(message.id, editText);
                          }
                        }}
                        className={cn("w-full", EDIT_INPUT_MIN_WIDTH)}>
                        <PromptInputBody>
                          <PromptInputTextarea
                            ref={editTextareaRef}
                            value={editText}
                            onChange={(e) => onEditTextChange(e.target.value)}
                            placeholder={EDIT_PLACEHOLDER}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault();
                                if (editText.trim()) {
                                  onSaveEdit(message.id, editText);
                                }
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                onCancelEdit();
                              }
                            }}
                          />
                        </PromptInputBody>
                        <PromptInputFooter>
                          <PromptInputTools>
                            <PromptInputButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={onCancelEdit}>
                              <X className="size-4" />
                            </PromptInputButton>
                          </PromptInputTools>
                          <PromptInputSubmit disabled={!editText.trim()} status="ready" />
                        </PromptInputFooter>
                      </PromptInput>
                    ) : (
                      <>
                        {message.parts.map((part, index) => (
                          <MessagePartRenderer key={index} part={part} index={index} />
                        ))}
                        <SourcesRenderer parts={message.parts} />
                      </>
                    )}
                  </MessageContent>

                  {!isEditing && message.role === "assistant" && (
                    <MessageActions>
                      <MessageAction
                        onClick={async () => {
                          if (!hasTextToCopy) {
                            toast.error(TOAST_MESSAGES.COPY_ERROR);
                            return;
                          }

                          // Check clipboard API availability
                          if (!navigator.clipboard) {
                            logError(
                              "[Chat]",
                              "Clipboard API not available",
                              new Error("navigator.clipboard is undefined")
                            );
                            toast.error(TOAST_MESSAGES.COPY_ERROR);
                            return;
                          }

                          try {
                            await navigator.clipboard.writeText(textParts);
                            toast.success(TOAST_MESSAGES.COPY_SUCCESS);
                          } catch (error) {
                            logError("[Chat]", "Clipboard write failed", error, {
                              textLength: textParts.length,
                            });
                            toast.error(TOAST_MESSAGES.COPY_ERROR);
                          }
                        }}
                        label="Copy"
                        tooltip="Copy response"
                        disabled={!hasTextToCopy || status === "streaming"}>
                        <Copy className="size-3" />
                      </MessageAction>

                      {/* Regenerate with confirmation */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <MessageAction
                            label="Regenerate"
                            tooltip="Regenerate from here"
                            disabled={!(status === "ready" || status === "error")}>
                            <RefreshCcw className="size-3" />
                          </MessageAction>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Regenerate from this message?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete all messages after this assistant message, then
                              regenerate the response for this message. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                // Slice conversation after the selected assistant message
                                onRegenerateFromMessage(message.id);
                              }}>
                              Regenerate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </MessageActions>
                  )}

                  {!isEditing && message.role === "user" && (
                    <MessageActions className="ml-auto">
                      <MessageAction
                        onClick={() => {
                          onEditMessage(message.id, textParts);
                        }}
                        label="Edit"
                        tooltip="Edit message"
                        disabled={!(status === "ready" || status === "error")}>
                        <Edit2 className="size-3" />
                      </MessageAction>

                      {/* Delete with confirmation */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <MessageAction
                            label="Delete"
                            tooltip="Delete message"
                            disabled={!(status === "ready" || status === "error")}>
                            <Trash2 className="size-3" />
                          </MessageAction>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will delete this user message and all subsequent messages. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                onDeleteMessage(message.id);
                                toast.success(TOAST_MESSAGES.MESSAGE_DELETED);
                              }}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </MessageActions>
                  )}
                </Message>
              );
            })}

            {status === "submitted" && (
              <Message from="assistant">
                <MessageContent>
                  <Loader size={16} />
                </MessageContent>
              </Message>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>An error occurred</AlertTitle>
                <AlertDescription>{error.message || "Please try again."}</AlertDescription>
              </Alert>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);
ChatMessages.displayName = "ChatMessages";

interface ChatInputProps {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  status: ReturnType<typeof useChat>["status"];
  selectedModelInfo: SelectedModelInfo;
  currentModel: string;
  selectorOpen: boolean;
  onSelectorOpenChange: (open: boolean) => void;
  models: ReadonlyArray<Model>;
  onModelSelect: (modelId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ChatInput = memo<ChatInputProps>(
  ({
    text,
    onTextChange,
    onSubmit,
    status,
    selectedModelInfo,
    currentModel,
    selectorOpen,
    onSelectorOpenChange,
    models,
    onModelSelect,
    textareaRef,
  }) => {
    const handleKeyDown = useTextareaKeyboardShortcuts();
    const groupedModels = useGroupedModels(models);

    return (
      <div className={CSS_CLASSES.inputContainer}>
        <div className={cn("mx-auto", CHAT_CONTAINER_MAX_WIDTH)}>
          <PromptInput onSubmit={onSubmit} className="mt-0" globalDrop multiple>
            <AttachmentHeaderInner />

            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => onTextChange(e.target.value)}
                ref={textareaRef}
                value={text}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
              />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                <PromptInputSpeechButton
                  onTranscriptionChange={onTextChange}
                  textareaRef={textareaRef}
                />

                <PromptInputButton
                  variant="ghost"
                  onClick={() => onSelectorOpenChange(true)}
                  className={CSS_CLASSES.modelButton}
                  aria-label="Select model">
                  <ModelSelectorLogoGroup>
                    <ModelSelectorLogo provider={selectedModelInfo.provider} />
                  </ModelSelectorLogoGroup>
                  <span className={CSS_CLASSES.modelName}>{selectedModelInfo.name}</span>
                </PromptInputButton>
              </PromptInputTools>

              <PromptInputSubmit disabled={!text && status !== "streaming"} status={status} />
            </PromptInputFooter>
          </PromptInput>

          <ModelSelector open={selectorOpen} onOpenChange={onSelectorOpenChange}>
            <ModelSelectorContent>
              <ModelSelectorInput placeholder="Search models..." />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <ModelSelectorGroup key={provider} heading={formatProviderName(provider)}>
                    {providerModels.map((model) => {
                      const isSelected = model.id === currentModel;
                      return (
                        <ModelSelectorItem
                          key={model.id}
                          onSelect={() => {
                            onModelSelect(model.id);
                            onSelectorOpenChange(false);
                          }}>
                          <ModelSelectorLogoGroup>
                            <ModelSelectorLogo provider={getModelProvider(model)} />
                          </ModelSelectorLogoGroup>
                          <div className="flex flex-1 items-baseline gap-2 overflow-hidden">
                            <ModelSelectorName className="flex-none">
                              {model.name}
                            </ModelSelectorName>
                            <span className={CSS_CLASSES.modelId}>({model.id})</span>
                          </div>
                          {isSelected && <Check className="ml-auto size-4 shrink-0 text-primary" />}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
        </div>
      </div>
    );
  }
);
ChatInput.displayName = "ChatInput";

/**
 * Chat header with navigation and user menu
 */
const ChatHeader = memo(({ onSettingsClick }: { onSettingsClick: () => void }) => {
  const { logout, isLoading } = useLogout();

  return (
    <header className={CSS_CLASSES.header}>
      <SidebarTrigger />
      <h1 className={CSS_CLASSES.headerTitle}>Chat</h1>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onSettingsClick} aria-label="Settings">
          <Settings className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={logout} disabled={isLoading} aria-label="Logout">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
});
ChatHeader.displayName = "ChatHeader";

/**
 * Main chat interface component using AI SDK UI.
 *
 * @remarks
 * This component provides a production-ready chat interface with comprehensive
 * error handling, type safety, and performance optimizations. It follows AI SDK
 * best practices and React 19 patterns.
 *
 * @features
 * - **Streaming**: Real-time streaming responses with error recovery
 * - **Tool Calling**: Exhaustive state handling for tool invocations
 * - **Attachments**: Image file support with media type validation
 * - **Keyboard Shortcuts**: Enter to send, Shift+Enter for new line
 * - **Auto-scroll**: Automatic scrolling to latest messages
 * - **Model Selection**: Dynamic model selection with fallback validation
 * - **Error Handling**: Structured logging and graceful error recovery
 * - **Accessibility**: ARIA labels and keyboard navigation support
 *
 * @architecture
 * - Uses AI SDK's useChat hook for state management
 * - Implements atomic cleanup patterns with AbortController
 * - Follows separation of concerns (rendering, logic, state)
 * - Memoizes expensive computations to prevent unnecessary re-renders
 *
 * @performance
 * - Memoized sub-components minimize re-renders
 * - Efficient message part rendering with type guards
 * - Optimized auto-scroll using IntersectionObserver pattern
 * - RAF-free focus management using microtasks
 *
 * @example
 * ```tsx
 * import { ChatClient } from '@/components/chat-client';
 *
 * export default function Page() {
 *   return <ChatClient />;
 * }
 * ```
 *
 * @see {@link https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot AI SDK UI Documentation}
 */
export function ChatClient({ initialData }: ChatClientProps) {
  const hydrationIdRef = useRef(useId()); // Stable ID for hydration key

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (error) => {
      logError("[Chat]", "Transport error", error, {
        type: error?.constructor?.name,
      });
    },
    onFinish: (result) => {
      if (result.isError) {
        logError("[Chat]", "Message streaming error", new Error("Stream finished with error"), {
          finishReason: result.finishReason,
          isAbort: result.isAbort,
          isDisconnect: result.isDisconnect,
        });
      }
    },
  });

  // ----- Settings & Store
  useSettingsSync();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.update);
  const currentModel = settings.models.defaultModel;

  const {
    conversations,
    order,
    selectedId,
    status: conversationStatuses,
    hydrated,
    hydrate,
    select: selectConversationId,
    upsert: upsertConversation,
    updateMessages: updateConversationMessages,
    updateTitle: updateConversationTitle,
    setStatus: setConversationStatus,
    remove: removeConversation,
  } = useChatStore();

  // ----- Local State
  const [text, setText] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // ----- Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingCreateRef = useRef<Promise<string> | null>(null);
  const statusChangeRef = useRef(status);
  const lastSyncedConversationIdRef = useRef<string | null>(null);

  // ----- Hooks
  const { models, selectedModelInfo } = useModelManagement(currentModel, (modelId) => {
    updateSettings(["models", "defaultModel"], modelId);
  });

  useAutoScroll(messagesContainerRef, messages);
  useAutoFocusTextarea(textareaRef);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!hydrated && initialData) {
      hydrate(initialData);
    }
  }, [hydrate, hydrated, initialData]);

  // Sync chat UI state when switching conversations without re-triggering store updates
  useEffect(() => {
    if (!selectedId) {
      lastSyncedConversationIdRef.current = null;
      setMessages([]);
      return;
    }

    if (lastSyncedConversationIdRef.current === selectedId) {
      return;
    }

    const conversation = conversations[selectedId];
    if (conversation) {
      lastSyncedConversationIdRef.current = selectedId;
      setMessages(conversation.messages);
    }
  }, [conversations, selectedId, setMessages]);

  useEffect(() => {
    if (selectedId) {
      updateConversationMessages(selectedId, messages);
    }
  }, [messages, selectedId, updateConversationMessages]);

  useEffect(() => {
    if (selectedId) {
      setConversationStatus(selectedId, mapUseChatStatus(status));
    }
  }, [selectedId, setConversationStatus, status]);

  const persistConversation = useCallback(
    async (conversationId: string) => {
      const conversation = conversations[conversationId];
      if (!conversation) return;

      // Abort previous persist requests to avoid stale updates
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conversationId,
            title: conversation.title,
            messages: messages.map(uiMessageToChatMessage),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "Unknown error");
          logWarn("[Chat]", "Persist conversation failed", {
            conversationId,
            status: response.status,
            detail,
          });
        }
      } catch (err) {
        // Ignore abort errors (component unmounted or new request started)
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        logError("[Chat]", "Persist conversation error", err, { conversationId });
      }
    },
    [conversations, messages]
  );

  useEffect(() => {
    if (!selectedId) return;

    const previous = statusChangeRef.current;
    if ((previous === "streaming" || previous === "submitted") && status === "ready") {
      void persistConversation(selectedId);
    }
    statusChangeRef.current = status;
  }, [persistConversation, selectedId, status]);

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      if (conversationId === selectedId) return;

      selectConversationId(conversationId);
      const conversation = conversations[conversationId];
      if (conversation) {
        setMessages(conversation.messages);
      } else {
        setMessages([]);
      }
      setText("");
      setEditingMessageId(null);
      setEditText("");
    },
    [conversations, selectConversationId, selectedId, setMessages]
  );

  const createConversation = useCallback(async (): Promise<string> => {
    // Prevent concurrent create requests
    if (pendingCreateRef.current) {
      return pendingCreateRef.current;
    }

    const createPromise = (async () => {
      setCreatingChat(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
          const response = await fetch("/api/chat/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: currentModel }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const detail = await response.text().catch(() => "Unknown error");
            throw new Error(`Create failed: ${response.status} - ${detail}`);
          }

          const data = await response.json().catch((err) => {
            throw new Error(
              `Invalid response: ${err instanceof Error ? err.message : String(err)}`
            );
          });

          const conversation = chatSessionToConversation(data.chat);
          upsertConversation(conversation);
          selectConversationId(conversation.id);
          setMessages([]);
          setText("");
          setEditingMessageId(null);
          setEditText("");
          return conversation.id;
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          logDebug("[Chat]", "Create conversation aborted");
          throw error;
        }

        logWarn("[Chat]", "Falling back to local chat creation", { error });
        const localId = crypto.randomUUID();
        const now = new Date().toISOString();
        upsertConversation({
          id: localId,
          title: "New chat",
          pinned: false,
          updatedAt: now,
          model: currentModel,
          suggestions: [],
          messages: [],
          checkpoints: [],
        });
        selectConversationId(localId);
        setMessages([]);
        setText("");
        setEditingMessageId(null);
        setEditText("");
        return localId;
      } finally {
        setCreatingChat(false);
        pendingCreateRef.current = null;
      }
    })();

    pendingCreateRef.current = createPromise;
    return createPromise;
  }, [currentModel, selectConversationId, setMessages, upsertConversation]);

  const ensureConversation = useCallback(async () => {
    if (selectedId && conversations[selectedId]) return selectedId;
    return createConversation();
  }, [conversations, createConversation, selectedId]);

  // ----- Event Handlers
  const handleModelSelect = useCallback(
    (modelId: string): void => {
      updateSettings(["models", "defaultModel"], modelId);
    },
    [updateSettings]
  );

  const handlePromptSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const hasText = Boolean(message.text?.trim());
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        logWarn("[Chat]", "Message submission blocked: no content");
        return;
      }

      if (status !== "ready") {
        logDebug("[Chat]", "Message submission blocked: not ready", { status });
        return;
      }

      try {
        const conversationId = await ensureConversation();
        const conversation = conversations[conversationId];

        if (conversation && (!conversation.title || conversation.title === "New chat")) {
          const generatedTitle = generateTitleFromText(message.text ?? "");
          if (generatedTitle && generatedTitle !== conversation.title) {
            updateConversationTitle(conversationId, generatedTitle);
          }
        }

        sendMessage(
          {
            text: (message.text ?? "").trim() || ATTACHMENT_ONLY_MESSAGE_TEXT,
            files: message.files,
          },
          {
            body: {
              model: currentModel,
            },
          }
        );

        setText("");

        queueMicrotask(() => {
          textareaRef.current?.focus();
        });
      } catch (error) {
        logError("[Chat]", "Prompt submission failed", error);
        toast.error("Failed to send message. Please try again.");
      }
    },
    [conversations, currentModel, ensureConversation, sendMessage, status, updateConversationTitle]
  );

  const handleNewChat = useCallback(async (): Promise<void> => {
    await createConversation();
    textareaRef.current?.focus();
  }, [createConversation]);

  const handleEditMessage = useCallback((messageId: string, initialText: string): void => {
    setEditText(initialText);
    setEditingMessageId(messageId);
  }, []);

  const handleCancelEdit = useCallback((): void => {
    setEditingMessageId(null);
    setEditText("");
  }, []);

  const handleSaveEdit = useCallback(
    (messageId: string, newText: string): void => {
      if (!newText.trim()) {
        toast.error(TOAST_MESSAGES.MESSAGE_EMPTY);
        return;
      }

      // Find the index of the message being edited
      const editIndex = messages.findIndex((m) => m.id === messageId);
      if (editIndex === -1) {
        logWarn("[Chat]", "Edit failed: message not found", { messageId });
        return;
      }

      try {
        // Remove all messages from the edited message onwards
        const newMessages = messages.slice(0, editIndex);
        setMessages(newMessages);

        // Clear edit state
        setEditingMessageId(null);
        setEditText("");

        // Re-send the edited message
        sendMessage(
          { text: newText },
          {
            body: {
              model: currentModel,
            },
          }
        );

        toast.success(TOAST_MESSAGES.MESSAGE_UPDATED);
      } catch (error) {
        logError("[Chat]", "Edit save failed", error);
        toast.error("Failed to update message");
      }
    },
    [messages, setMessages, sendMessage, currentModel]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string): void => {
      // Find the index of the message to delete
      const deleteIndex = messages.findIndex((m) => m.id === messageId);
      if (deleteIndex === -1) {
        logWarn("[Chat]", "Delete failed: message not found", { messageId });
        return;
      }

      // Remove the message and all subsequent messages
      const newMessages = messages.slice(0, deleteIndex);
      setMessages(newMessages);
    },
    [messages, setMessages]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId: string) => {
      setDeleting((prev) => ({ ...prev, [conversationId]: true }));
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

        try {
          const response = await fetch("/api/chat/delete", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: conversationId }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const detail = await response.text().catch(() => "Unknown error");
            throw new Error(detail || "Failed to delete conversation");
          }

          removeConversation(conversationId);

          if (selectedId === conversationId) {
            const fallback = order.find((id) => id !== conversationId) ?? null;
            selectConversationId(fallback);
            if (fallback && conversations[fallback]) {
              setMessages(conversations[fallback].messages);
            } else {
              setMessages([]);
            }
          }

          toast.success("Conversation deleted");
        } catch (err) {
          clearTimeout(timeoutId);
          throw err;
        }
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          logDebug("[Chat]", "Delete conversation aborted", { conversationId });
          return;
        }
        logError("[Chat]", "Delete conversation failed", err, { conversationId });
        toast.error("Failed to delete conversation");
      } finally {
        setDeleting((prev) => ({ ...prev, [conversationId]: false }));
      }
    },
    [conversations, order, removeConversation, selectConversationId, selectedId, setMessages]
  );

  const handleRegenerateFromMessage = useCallback(
    (messageId: string): void => {
      // Block while streaming/submitted
      if (!(status === "ready" || status === "error")) {
        logDebug("[Chat]", "Regenerate blocked: status", { status });
        return;
      }

      const targetIndex = messages.findIndex((m) => m.id === messageId);
      if (targetIndex === -1) {
        logWarn("[Chat]", "Regenerate failed: message not found", { messageId });
        return;
      }

      const targetMessage = messages[targetIndex];
      if (targetMessage.role !== "assistant") {
        logWarn("[Chat]", "Regenerate requires an assistant message", { messageId });
        toast.error("Select an assistant message to regenerate.");
        return;
      }

      try {
        // Keep the selected assistant message as the last message; remove subsequent messages
        const newMessages = messages.slice(0, targetIndex + 1);
        setMessages(newMessages);

        // Regenerate the last assistant message
        regenerate();
      } catch (error) {
        logError("[Chat]", "Regenerate failed", error, { messageId, targetIndex });
        toast.error("Failed to regenerate message.");
      }
    },
    [messages, setMessages, regenerate, status]
  );

  return (
    <SidebarProvider>
      <Sidebar>
        <div className={CSS_CLASSES.sidebar}>
          <div className={CSS_CLASSES.newChatButton}>
            <Button
              onClick={() => void handleNewChat()}
              className="w-full"
              variant="outline"
              disabled={creatingChat}>
              {creatingChat ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <PlusIcon className="mr-2 size-4" />
              )}
              New Chat
            </Button>
          </div>
          <SidebarSeparator />
          <ConversationList
            order={order}
            conversations={conversations}
            statuses={conversationStatuses}
            selectedId={selectedId}
            deleting={deleting}
            onSelect={handleSelectConversation}
            onDelete={handleDeleteConversation}
          />
        </div>
      </Sidebar>

      <SidebarInset>
        <div className={CSS_CLASSES.chatContainer}>
          {/* Header */}
          <ChatHeader onSettingsClick={() => setSettingsOpen(true)} />

          {/* Settings Modal */}
          <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

          {/* Messages */}
          <ChatMessages
            messages={messages}
            status={status}
            error={error}
            messagesContainerRef={messagesContainerRef}
            editingMessageId={editingMessageId}
            editText={editText}
            onEditMessage={handleEditMessage}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onDeleteMessage={handleDeleteMessage}
            onEditTextChange={setEditText}
            onRegenerateFromMessage={handleRegenerateFromMessage}
          />

          {/* Input */}
          <ChatInput
            text={text}
            onTextChange={setText}
            onSubmit={handlePromptSubmit}
            status={status}
            selectedModelInfo={selectedModelInfo}
            currentModel={currentModel}
            selectorOpen={selectorOpen}
            onSelectorOpenChange={setSelectorOpen}
            models={models}
            onModelSelect={handleModelSelect}
            textareaRef={textareaRef}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
