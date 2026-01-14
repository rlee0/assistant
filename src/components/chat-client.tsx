"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Message, MessageContent, MessageActions } from "@/components/ai-elements/message";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { Spinner } from "@/components/ui/spinner";
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
import { PlusIcon, Check } from "lucide-react";
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

/** CSS classes */
const CSS_CLASSES = {
  toolDisplay: "rounded-md bg-muted p-3 text-xs",
  toolHeader: "flex items-center justify-between",
  toolContent: "mt-1 text-muted-foreground font-mono whitespace-pre-wrap",
  emptyState: "text-center text-muted-foreground py-12",
  errorContainer: "rounded-md bg-destructive/10 p-4 text-destructive",
  errorTitle: "font-semibold",
  errorMessage: "text-sm mt-1",
  prose: "prose prose-sm dark:prose-invert max-w-none",
  reasoning: "rounded-md bg-muted p-3 text-xs text-muted-foreground",
  reasoningTitle: "font-semibold mb-1",
  reasoningContent: "font-mono whitespace-pre-wrap text-[10px]",
  image: "max-w-sm rounded-md h-auto",
  sourceLink: "text-blue-500 hover:underline text-sm",
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
 * Renders an empty state when no messages exist
 */
const EmptyState = memo(() => (
  <div className={CSS_CLASSES.emptyState}>
    <p>Start a conversation by typing a message below.</p>
  </div>
));
EmptyState.displayName = "EmptyState";

/**
 * Renders a loading state with spinner
 */
const LoadingState = memo(() => (
  <Message from="assistant">
    <MessageContent>
      <Spinner className="size-4" />
    </MessageContent>
  </Message>
));
LoadingState.displayName = "LoadingState";

/**
 * Internal component that uses PromptInput attachment hook.
 * Must be rendered within PromptInput context.
 */
const AttachmentHeaderInner = memo(() => {
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
});
AttachmentHeaderInner.displayName = "AttachmentHeaderInner";

/**
 * Renders an error message with accessible ARIA attributes
 */
const ErrorDisplay = memo<{ error: Error }>(({ error }) => (
  <div className={CSS_CLASSES.errorContainer} role="alert" aria-live="assertive">
    <p className={CSS_CLASSES.errorTitle}>An error occurred</p>
    <p className={CSS_CLASSES.errorMessage}>{error.message || "Please try again."}</p>
  </div>
));
ErrorDisplay.displayName = "ErrorDisplay";

/**
 * Renders a message part based on its type with exhaustive type checking
 */
const MessagePartRenderer = memo<{
  part: ReturnType<typeof useChat>["messages"][number]["parts"][number];
  index: number;
}>(({ part, index }) => {
  // Text content
  if (part.type === "text") {
    return (
      <div key={index} className={CSS_CLASSES.prose}>
        <ReactMarkdown>{part.text}</ReactMarkdown>
      </div>
    );
  }

  // Reasoning/thinking content
  if (part.type === "reasoning") {
    return (
      <div key={index} className={CSS_CLASSES.reasoning}>
        <div className={CSS_CLASSES.reasoningTitle}>Reasoning</div>
        <div className={CSS_CLASSES.reasoningContent}>{part.text}</div>
      </div>
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

  // Image files
  if (part.type === "file" && part.mediaType?.startsWith("image/")) {
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

  // Source URLs from web search
  if (part.type === "source-url") {
    return (
      <a
        key={index}
        href={part.url}
        target="_blank"
        rel="noopener noreferrer"
        className={CSS_CLASSES.sourceLink}>
        {part.title || part.url}
      </a>
    );
  }

  // Unsupported or unknown part types
  return null;
});
MessagePartRenderer.displayName = "MessagePartRenderer";

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
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
}

const ChatMessages = memo<ChatMessagesProps>(({ messages, status, error, scrollAreaRef }) => (
  <div className={CSS_CLASSES.messagesContainer}>
    <ScrollArea ref={scrollAreaRef} className="h-full px-4">
      <div className={`${CSS_CLASSES.messagesInner} ${CHAT_CONTAINER_MAX_WIDTH}`}>
        {messages.length === 0 && <EmptyState />}

        {messages.map((message) => (
          <Message key={message.id} from={message.role}>
            <MessageContent>
              {message.parts.map((part, index) => (
                <MessagePartRenderer key={index} part={part} index={index} />
              ))}
            </MessageContent>

            {message.role === "assistant" && (
              <MessageActions>
                {/* Future: Add copy, regenerate, and other actions */}
              </MessageActions>
            )}
          </Message>
        ))}

        {status === "submitted" && <LoadingState />}

        {error && <ErrorDisplay error={error} />}
      </div>
    </ScrollArea>
  </div>
));
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
 * Main chat interface component using AI SDK UI
 *
 * Features:
 * - Real-time streaming responses with error recovery
 * - Tool calling support with exhaustive state handling
 * - File attachments (images) with validation
 * - Keyboard shortcuts (Enter to send, Shift+Enter for new line)
 * - Auto-scrolling to latest messages
 * - Model selection with fallback validation
 * - Structured error logging
 */
export function ChatClient() {
  const { messages, sendMessage, status, error, setMessages } = useChat({
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
    (modelId: string) => {
      updateSettings(["models", "defaultModel"], modelId);
    },
    [updateSettings]
  );
  const rafIdRef = useRef<number | null>(null);

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
          text: message.text || "Sent with attachments",
          files: message.files,
        },
        {
          body: {
            model: currentModel,
          },
        }
      );

      setText("");

      // Cancel previous RAF if exists
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }

      rafIdRef.current = requestAnimationFrame(() => {
        textareaRef.current?.focus();
        rafIdRef.current = null;
      });
    },
    [currentModel, status, sendMessage]
  );

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const handleNewChat = useCallback(() => {
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
