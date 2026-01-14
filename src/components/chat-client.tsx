"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { API_ROUTES } from "@/lib/api/routes";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { AppSidebar } from "@/components/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { Check, AlertCircle, Copy, RefreshCcw, Edit2, Trash2, X } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";
import {
  useChatStore,
  chatSessionToConversation,
  type ConversationStatus,
} from "@/store/chat-store";
import { useSettingsSync } from "@/hooks/use-settings-sync";
import { logError, logWarn, logDebug } from "@/lib/logging";
import { cn } from "@/lib/utils";
import { type InitialChatData } from "@/lib/supabase/loaders";
import { type ChatMessage, type ChatSession } from "@/types/chat";
import { ModelSelectorSkeleton } from "@/components/skeletons/sidebar-skeleton";
import { useStickToBottomContext } from "use-stick-to-bottom";
import {
  CHAT_CONTAINER_MAX_WIDTH,
  DEFAULT_PROVIDER,
  CSS_CLASSES,
  MESSAGE_PART_TYPE,
  ATTACHMENT_ONLY_MESSAGE_TEXT,
  EDIT_INPUT_MIN_WIDTH,
  EDIT_PLACEHOLDER,
  TOAST_MESSAGES,
  CHAT_REQUEST_TIMEOUT_MS,
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
  readonly conversationId?: string;
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
  // Extract createdAt from message with type safety, defaulting to current time
  const createdAt =
    typeof message === "object" && message !== null && "createdAt" in message
      ? (message as Record<string, unknown>).createdAt
      : null;

  const timestamp = typeof createdAt === "string" ? createdAt : new Date().toISOString();

  return {
    id: message.id,
    role: message.role,
    content: extractTextFromMessage(message),
    createdAt: timestamp,
  };
}

function areMessagesEqual(
  existing: ReadonlyArray<UseChatMessage> | undefined,
  incoming: ReadonlyArray<UseChatMessage>
): boolean {
  if (!existing || existing.length !== incoming.length) return false;

  for (let index = 0; index < existing.length; index += 1) {
    const left = existing[index];
    const right = incoming[index];

    if (left.id !== right.id || left.role !== right.role) return false;

    const leftParts = JSON.stringify(left.parts ?? []);
    const rightParts = JSON.stringify(right.parts ?? []);
    if (leftParts !== rightParts) return false;
  }

  return true;
}

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
  modelsLoading: boolean;
} {
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const hasValidatedRef = useRef(false);
  const onModelUpdateRef = useRef(onModelUpdate);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    onModelUpdateRef.current = onModelUpdate;
  }, [onModelUpdate]);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const loadModels = async (): Promise<void> => {
      try {
        setModelsLoading(true);
        const list = await fetchModels();

        if (signal.aborted) return;

        // Validate models array
        if (!Array.isArray(list) || list.length === 0) {
          logWarn("[Chat]", "Empty models list returned from API");
          setModels([]);
          setModelsLoading(false);
          return;
        }

        setModels(list);
        setModelsLoading(false);

        // Validate selected model is available (only once, use stable ref check)
        if (!hasValidatedRef.current && !list.some((m) => m.id === currentModel)) {
          hasValidatedRef.current = true;
          const firstModel = list[0];
          if (firstModel && "id" in firstModel) {
            onModelUpdateRef.current(firstModel.id);
          }
        }
      } catch (err) {
        if (signal.aborted) return;
        logError("[Chat]", "Model loading failed", err);
        setModels([]);
        setModelsLoading(false);
      }
    };

    void loadModels();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [currentModel]);

  const selectedModelInfo = useMemo<SelectedModelInfo>(() => {
    const selected = models.find((m) => m.id === currentModel);
    return {
      name: selected?.name ?? currentModel,
      provider: selected ? getModelProvider(selected) : DEFAULT_PROVIDER,
    };
  }, [models, currentModel]);

  return { models, selectedModelInfo, modelsLoading };
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
  readonly messages: ReturnType<typeof useChat>["messages"];
  readonly status: ReturnType<typeof useChat>["status"];
  readonly error: ReturnType<typeof useChat>["error"];
  readonly messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  readonly editingMessageId: string | null;
  readonly editText: string;
  readonly hydrated: boolean;
  readonly scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  readonly onEditMessage: (messageId: string, initialText: string) => void;
  readonly onCancelEdit: () => void;
  readonly onSaveEdit: (messageId: string, newText: string) => void;
  readonly onDeleteMessage: (messageId: string) => void;
  readonly onEditTextChange: (text: string) => void;
  readonly onRegenerateFromMessage: (messageId: string) => void;
}

const ChatMessages = memo<ChatMessagesProps>(
  ({
    messages,
    status,
    error,
    messagesContainerRef,
    editingMessageId,
    editText,
    hydrated,
    scrollToBottomRef,
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
        <Conversation>
          <ConversationContent>
            <div className={cn("w-full", CSS_CLASSES.messagesInner, CHAT_CONTAINER_MAX_WIDTH)}>
              {!hydrated ? null : messages.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Start a Conversation</EmptyTitle>
                    <EmptyDescription>Type a message below to begin chatting.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  {messages.map((message, messageIndex) => {
                    const isEditing = message.id === editingMessageId;
                    const isAfterEditedMessage =
                      editingMessageId &&
                      messageIndex > messages.findIndex((m) => m.id === editingMessageId);

                    // Validate message.parts is an array before accessing
                    const parts = Array.isArray(message.parts) ? message.parts : [];

                    // Extract text content for copy and edit functionality
                    const textParts = parts
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
                              {parts.map((part, index) => (
                                <MessagePartRenderer key={index} part={part} index={index} />
                              ))}
                              <SourcesRenderer parts={parts} />
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
                                    This will delete this user message and all subsequent messages.
                                    This action cannot be undone.
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
                </>
              )}
            </div>
          </ConversationContent>
          <ConversationScrollButton />
          <ScrollToBottomCapture scrollToBottomRef={scrollToBottomRef} />
        </Conversation>
      </div>
    );
  }
);
ChatMessages.displayName = "ChatMessages";

/**
 * Captures the scrollToBottom function from Conversation context and stores it in a ref
 */
const ScrollToBottomCapture = memo<{
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
}>(({ scrollToBottomRef }) => {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
    return () => {
      scrollToBottomRef.current = null;
    };
  }, [scrollToBottom, scrollToBottomRef]);

  return null;
});
ScrollToBottomCapture.displayName = "ScrollToBottomCapture";

interface ChatInputProps {
  readonly text: string;
  readonly onTextChange: (text: string) => void;
  readonly onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  readonly status: ReturnType<typeof useChat>["status"];
  readonly selectedModelInfo: SelectedModelInfo;
  readonly currentModel: string;
  readonly selectorOpen: boolean;
  readonly onSelectorOpenChange: (open: boolean) => void;
  readonly models: ReadonlyArray<Model>;
  readonly modelsLoading: boolean;
  readonly onModelSelect: (modelId: string) => void;
  readonly textareaRef: React.RefObject<HTMLTextAreaElement | null>;
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
    modelsLoading,
    onModelSelect,
    textareaRef,
  }) => {
    const handleKeyDown = useTextareaKeyboardShortcuts();
    const groupedModels = useGroupedModels(models);

    return (
      <div className={CSS_CLASSES.inputContainer}>
        <div className={cn("w-full mx-auto", CHAT_CONTAINER_MAX_WIDTH)}>
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
                  disabled={modelsLoading}
                  aria-label="Select model">
                  {modelsLoading ? (
                    <ModelSelectorSkeleton />
                  ) : (
                    <>
                      <ModelSelectorLogoGroup>
                        <ModelSelectorLogo provider={selectedModelInfo.provider} />
                      </ModelSelectorLogoGroup>
                      <span className={CSS_CLASSES.modelName}>{selectedModelInfo.name}</span>
                    </>
                  )}
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
          <div className="text-center text-xs text-muted-foreground p-2">
            AI can make mistakes, so please verify its responses.
          </div>
        </div>
      </div>
    );
  }
);
ChatInput.displayName = "ChatInput";

/**
 * Chat header with breadcrumb navigation
 */
const ChatHeader = memo(({ conversationTitle }: { conversationTitle: string }) => {
  return (
    <header className="sticky top-0 z-10 flex shrink-0 items-center p-4 gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{conversationTitle || "Chat"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
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
export function ChatClient({ initialData, conversationId }: ChatClientProps) {
  const router = useRouter();

  // Get store and hydrate immediately
  const {
    conversations,
    order,
    selectedId: storeSelectedId,
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

  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (error) => {
      // Check if error is due to authentication failure
      if (
        error instanceof Error &&
        "status" in error &&
        (error as { status?: number }).status === 401
      ) {
        logError("[Chat]", "Authentication required - redirecting to login", error);
        router.push("/login");
        return;
      }
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

  // Use route conversationId if provided, otherwise use store selectedId
  const selectedId = conversationId ?? storeSelectedId;

  // ----- Local State
  const [text, setText] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [creatingChat, setCreatingChat] = useState(false);
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});

  // ----- Refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingCreateRef = useRef<Promise<string> | null>(null);
  const statusChangeRef = useRef<ReturnType<typeof useChat>["status"]>(status);
  const loadedConversationIdRef = useRef<string | null>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  // ----- Hooks
  const { models, selectedModelInfo, modelsLoading } = useModelManagement(
    currentModel,
    (modelId) => {
      updateSettings(["models", "defaultModel"], modelId);
    }
  );

  useAutoFocusTextarea(textareaRef);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Step 1: Hydrate store on mount
  useEffect(() => {
    if (hydrated || !initialData) return;
    hydrate(initialData);
  }, [hydrated, initialData, hydrate]);

  // Step 2: Sync route conversationId with store selection
  useEffect(() => {
    if (!conversationId || conversationId === storeSelectedId) return;
    selectConversationId(conversationId);
  }, [conversationId, storeSelectedId, selectConversationId]);

  // Step 3: Load conversation messages when selectedId or conversations change
  useEffect(() => {
    // Don't load messages until store is hydrated
    if (!hydrated) return;

    if (!selectedId) {
      // No conversation selected - clear everything
      loadedConversationIdRef.current = null;
      setMessages([]);
      return;
    }

    const conversation = conversations[selectedId];

    // Wait for conversation to exist in store
    if (!conversation) {
      return;
    }

    // Skip if we've already loaded this exact conversation
    if (loadedConversationIdRef.current === selectedId) {
      return;
    }

    // Load conversation messages
    loadedConversationIdRef.current = selectedId;
    setMessages(conversation.messages || []);
  }, [selectedId, conversations, setMessages, hydrated]);

  // Step 4: Sync messages from useChat back to store
  useEffect(() => {
    if (!selectedId) return;

    // Skip syncing back during initial load - messages are being set FROM store in Step 3
    if (loadedConversationIdRef.current !== selectedId) return;

    const storedMessages = conversations[selectedId]?.messages;
    if (areMessagesEqual(storedMessages, messages)) return;

    updateConversationMessages(selectedId, messages);
  }, [messages, selectedId, conversations, updateConversationMessages]);

  // Step 5: Update conversation status
  useEffect(() => {
    if (selectedId) {
      setConversationStatus(selectedId, mapUseChatStatus(status));
    }
  }, [selectedId, setConversationStatus, status]);

  // Step 6: Auto-scroll to bottom when messages change or streaming starts
  useEffect(() => {
    if (!selectedId || !scrollToBottomRef.current) return;

    // Scroll when messages change or streaming starts
    scrollToBottomRef.current();
  }, [messages, selectedId, status]);

  const persistConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      const conversation = conversations[conversationId];
      if (!conversation) return;

      // Abort previous persist requests to avoid stale updates
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(API_ROUTES.CHAT.UPDATE, {
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
          // Check for authentication error
          if (response.status === 401) {
            logError(
              "[Chat]",
              "Authentication required for persistence",
              new Error("Unauthorized")
            );
            router.push("/login");
            return;
          }
          const detail = await response.text().catch(() => "Unknown error");
          logWarn("[Chat]", "Persist conversation failed", {
            conversationId,
            status: response.status,
            detail,
          });
          return;
        }
      } catch (err) {
        // Ignore abort errors (component unmounted or new request started)
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        logError("[Chat]", "Persist conversation error", err, {
          conversationId,
        });
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
      // Don't manually set messages here - route change will trigger useChat state update
      // via the id parameter changing. Just clear UI state.
      setText("");
      setEditingMessageId(null);
      setEditText("");
    },
    [selectConversationId, selectedId]
  );

  const resetUIState = useCallback((): void => {
    setText("");
    setEditingMessageId(null);
    setEditText("");
  }, []);

  const createConversation = useCallback(async (): Promise<string> => {
    // Prevent concurrent create requests
    if (pendingCreateRef.current) {
      return pendingCreateRef.current;
    }

    const createPromise = (async (): Promise<string> => {
      setCreatingChat(true);
      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        CHAT_REQUEST_TIMEOUT_MS
      );

      try {
        const response = await fetch(API_ROUTES.CHAT.CREATE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: currentModel }),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          // Check for authentication error
          if (response.status === 401) {
            logError(
              "[Chat]",
              "Authentication required for conversation creation",
              new Error("Unauthorized")
            );
            router.push("/login");
            throw new Error("Authentication required");
          }
          const detail = await response.text().catch(() => "Unknown error");
          throw new Error(`Create failed: ${response.status} - ${detail}`);
        }

        const data = (await response.json()) as { chat: ChatSession };
        const conversation = chatSessionToConversation(data.chat);
        upsertConversation(conversation);
        selectConversationId(conversation.id);
        router.push(`/chat/${conversation.id}`);
        setMessages([]);
        resetUIState();
        return conversation.id;
      } catch (error) {
        // Handle abort errors separately
        if (error instanceof Error && error.name === "AbortError") {
          logDebug("[Chat]", "Create conversation aborted");
          throw error;
        }

        // Log error and re-throw - no fallback to prevent desync
        logError("[Chat]", "Failed to create conversation", error);
        toast.error("Failed to create conversation. Please try again.");
        throw error;
      } finally {
        clearTimeout(timeoutId);
        setCreatingChat(false);
        pendingCreateRef.current = null;
      }
    })();

    pendingCreateRef.current = createPromise;
    return createPromise;
  }, [currentModel, selectConversationId, setMessages, upsertConversation, router, resetUIState]);

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

        // Scroll to bottom after sending message
        queueMicrotask(() => {
          scrollToBottomRef.current?.();
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
        toast.error("Message not found. Please try again.");
        return;
      }

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
    },
    [messages, setMessages, sendMessage, currentModel]
  );

  const handleDeleteMessage = useCallback(
    (messageId: string): void => {
      // Find the index of the message to delete
      const deleteIndex = messages.findIndex((m) => m.id === messageId);
      if (deleteIndex === -1) {
        logWarn("[Chat]", "Delete failed: message not found", { messageId });
        toast.error("Message not found. Please try again.");
        return;
      }

      // Remove the message and all subsequent messages
      const newMessages = messages.slice(0, deleteIndex);
      setMessages(newMessages);
    },
    [messages, setMessages]
  );

  const handleDeleteConversation = useCallback(
    async (conversationIdToDelete: string): Promise<void> => {
      setDeleting((prev) => ({ ...prev, [conversationIdToDelete]: true }));
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(API_ROUTES.CHAT.DELETE, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: conversationIdToDelete }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "Unknown error");
          throw new Error(detail || "Failed to delete conversation");
        }

        removeConversation(conversationIdToDelete);

        // Navigate away if deleting the current route's conversation
        if (conversationIdToDelete === conversationId) {
          const fallback = order.find((id) => id !== conversationIdToDelete) ?? null;
          selectConversationId(fallback);
          if (fallback) {
            router.push(`/chat/${fallback}`);
            const conversation = conversations[fallback];
            if (conversation) {
              setMessages(conversation.messages);
            }
          } else {
            router.push("/");
            setMessages([]);
          }
        }

        toast.success("Conversation deleted");
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          logDebug("[Chat]", "Delete conversation aborted", { conversationIdToDelete });
          return;
        }
        logError("[Chat]", "Delete conversation failed", err, { conversationIdToDelete });
        toast.error("Failed to delete conversation");
      } finally {
        clearTimeout(timeoutId);
        setDeleting((prev) => ({ ...prev, [conversationIdToDelete]: false }));
      }
    },
    [
      conversations,
      order,
      removeConversation,
      selectConversationId,
      conversationId,
      setMessages,
      router,
    ]
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

  const currentConversation = selectedId ? conversations[selectedId] : null;
  const conversationTitle = currentConversation?.title || "New chat";

  // Get user info from settings or use default
  const user = {
    name: settings.account.displayName,
    email: settings.account.email,
  };

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        conversations={conversations}
        conversationOrder={order}
        selectedId={selectedId}
        conversationStatuses={conversationStatuses}
        deleting={deleting}
        creatingChat={creatingChat}
        hydrated={hydrated}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <SidebarInset>
        <ChatHeader conversationTitle={conversationTitle} />
        <div className="flex flex-1 flex-col min-h-0">
          {/* Messages */}
          <ChatMessages
            messages={messages}
            status={status}
            error={error}
            messagesContainerRef={messagesContainerRef}
            editingMessageId={editingMessageId}
            editText={editText}
            hydrated={hydrated}
            scrollToBottomRef={scrollToBottomRef}
            onEditMessage={handleEditMessage}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            onDeleteMessage={handleDeleteMessage}
            onEditTextChange={setEditText}
            onRegenerateFromMessage={handleRegenerateFromMessage}
          />

          {/* Input */}
          {!hydrated ? null : (
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
              modelsLoading={modelsLoading}
              onModelSelect={handleModelSelect}
              textareaRef={textareaRef}
            />
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
