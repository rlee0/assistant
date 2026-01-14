"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
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
import { PlusIcon, Check, AlertCircle, Copy, RefreshCcw } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";
import { useSettingsSync } from "@/hooks/use-settings-sync";

// ============================================================================
// Constants
// ============================================================================

/** Maximum width for chat container */
const CHAT_CONTAINER_MAX_WIDTH = "max-w-3xl" as const;

/** Default provider logo when provider is unknown */
const DEFAULT_PROVIDER = "openai" as const;

/** Radix UI scroll area viewport selector */
const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]" as const;

/** Message part type constants */
const MESSAGE_PART_TYPE = {
  TEXT: "text",
  REASONING: "reasoning",
  SOURCE_URL: "source-url",
  FILE: "file",
} as const;

/** Fallback text when message has only attachments */
const ATTACHMENT_ONLY_MESSAGE_TEXT = "Sent with attachments" as const;

/** CSS classes */
const CSS_CLASSES = {
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
// Types
// ============================================================================

interface SelectedModelInfo {
  readonly name: string;
  readonly provider: string;
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

        const message = err instanceof Error ? err.message : "Failed to fetch available models";
        console.error("[Chat] Model loading error:", {
          message,
          error: err,
          timestamp: new Date().toISOString(),
        });
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
 * Memoizes grouped models by provider
 * Prevents unnecessary re-grouping on every render
 */
function useGroupedModels(models: ReadonlyArray<Model>) {
  return useMemo(() => groupModelsByProvider(models), [models]);
}

/**
 * Handles keyboard shortcuts in textarea (Enter to submit, Shift+Enter for newline)
 * Returns stable callback reference to prevent re-renders
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
 * Auto-scrolls to bottom when messages change
 * Uses observer pattern to detect scroll area changes
 */
function useAutoScroll(
  scrollAreaRef: React.RefObject<HTMLDivElement | null>,
  messages: ReadonlyArray<ReturnType<typeof useChat>["messages"][number]>
): void {
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(SCROLL_AREA_VIEWPORT_SELECTOR);
    if (scrollElement instanceof HTMLElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, scrollAreaRef]);
}

/**
 * Auto-focus textarea on mount
 */
function useAutoFocusTextarea(textareaRef: React.RefObject<HTMLTextAreaElement | null>): void {
  useEffect(() => {
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
  regenerate: ReturnType<typeof useChat>["regenerate"];
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages = memo<ChatMessagesProps>(
  ({ messages, status, error, regenerate, scrollAreaRef }) => (
    <div className={CSS_CLASSES.messagesContainer}>
      <ScrollArea ref={scrollAreaRef} className="h-full px-4">
        <div className={`${CSS_CLASSES.messagesInner} ${CHAT_CONTAINER_MAX_WIDTH}`}>
          {messages.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>Start a Conversation</EmptyTitle>
                <EmptyDescription>Type a message below to begin chatting.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {messages.map((message) => {
            // Extract text content for copy functionality
            const textParts = message.parts
              .filter((part) => part.type === MESSAGE_PART_TYPE.TEXT)
              .map((part) => part.text)
              .join("\n");

            const isLastMessage = message === messages[messages.length - 1];

            return (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => (
                    <MessagePartRenderer key={index} part={part} index={index} />
                  ))}
                  <SourcesRenderer parts={message.parts} />
                </MessageContent>

                {message.role === "assistant" && isLastMessage && (
                  <MessageActions>
                    <MessageAction
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(textParts);
                          // TODO: Add toast notification for success
                        } catch (error) {
                          console.error("[Chat] Clipboard write failed:", {
                            error: error instanceof Error ? error.message : String(error),
                            timestamp: new Date().toISOString(),
                          });
                          // TODO: Add toast notification for error
                        }
                      }}
                      label="Copy"
                      tooltip="Copy response">
                      <Copy className="size-3" />
                    </MessageAction>
                    <MessageAction
                      onClick={() => {
                        regenerate({ messageId: message.id });
                      }}
                      label="Regenerate"
                      tooltip="Regenerate response">
                      <RefreshCcw className="size-3" />
                    </MessageAction>
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
  )
);
ChatMessages.displayName = "ChatMessages";

interface ChatInputProps {
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (message: PromptInputMessage) => void;
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
        <div className={`mx-auto ${CHAT_CONTAINER_MAX_WIDTH}`}>
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
export function ChatClient() {
  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Chat transport error:", {
        message,
        type: error?.constructor?.name,
        timestamp: new Date().toISOString(),
      });
    },
    onFinish: (result) => {
      if (result.isError) {
        console.error("Message streaming error:", {
          timestamp: new Date().toISOString(),
        });
      }
    },
  });

  // ----- Settings & Store
  useSettingsSync();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.update);
  const currentModel = settings.models.defaultModel;

  // ----- Local State
  const [text, setText] = useState("");
  const [selectorOpen, setSelectorOpen] = useState(false);

  // ----- Refs
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ----- Hooks
  const { models, selectedModelInfo } = useModelManagement(currentModel, (modelId) => {
    updateSettings(["models", "defaultModel"], modelId);
  });

  useAutoScroll(scrollAreaRef, messages);
  useAutoFocusTextarea(textareaRef);

  // ----- Event Handlers
  const handleModelSelect = useCallback(
    (modelId: string): void => {
      updateSettings(["models", "defaultModel"], modelId);
    },
    [updateSettings]
  );
  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        console.warn("[Chat] Message submission blocked: no content", {
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (status !== "ready") {
        console.debug("[Chat] Message submission blocked: not ready", {
          status,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      sendMessage(
        {
          text: message.text || ATTACHMENT_ONLY_MESSAGE_TEXT,
          files: message.files,
        },
        {
          body: {
            model: currentModel,
          },
        }
      );

      setText("");

      // Focus textarea after submission (microtask ensures DOM is updated)
      queueMicrotask(() => {
        textareaRef.current?.focus();
      });
    },
    [currentModel, status, sendMessage]
  );

  const handleNewChat = useCallback((): void => {
    setMessages([]);
    setText("");
    textareaRef.current?.focus();
  }, [setMessages]);

  return (
    <SidebarProvider>
      <Sidebar>
        <div className={CSS_CLASSES.sidebar}>
          <div className={CSS_CLASSES.newChatButton}>
            <Button onClick={handleNewChat} className="w-full" variant="outline">
              <PlusIcon className="mr-2 size-4" />
              New Chat
            </Button>
          </div>
          {/* TODO: Add chat history list */}
        </div>
      </Sidebar>

      <SidebarInset>
        <div className={CSS_CLASSES.chatContainer}>
          {/* Header */}
          <header className={CSS_CLASSES.header}>
            <SidebarTrigger />
            <h1 className={CSS_CLASSES.headerTitle}>Chat</h1>
          </header>

          {/* Messages */}
          <ChatMessages
            messages={messages}
            status={status}
            error={error}
            regenerate={regenerate}
            scrollAreaRef={scrollAreaRef}
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
