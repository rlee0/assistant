"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type DynamicToolUIPart } from "ai";
import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Message, MessageContent, MessageActions } from "@/components/ai-elements/message";
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
import { fetchModels, type Model } from "@/lib/models";
import { DEFAULT_MODEL } from "@/lib/constants";
import { StopCircleIcon, PlusIcon } from "lucide-react";
import { useSettingsStore } from "@/store/settings-store";
import { useSettingsSync } from "@/hooks/use-settings-sync";

// ============================================================================
// Constants
// ============================================================================

/** Maximum width for chat container */
const CHAT_CONTAINER_MAX_WIDTH = "max-w-3xl";

/** Default provider logo when provider is unknown */
const DEFAULT_PROVIDER = "openai" as const;

/** Radix UI scroll area viewport selector */
const SCROLL_AREA_VIEWPORT_SELECTOR = "[data-radix-scroll-area-viewport]" as const;

// ============================================================================
// Types
// ============================================================================

interface ChatState {
  text: string;
  models: Model[];
  selectorOpen: boolean;
}

interface SelectedModelInfo {
  name: string;
  provider: string;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Renders a tool call with its current state
 */
const ToolCallDisplay = memo<{
  part: DynamicToolUIPart;
  toolName: string;
}>(({ part, toolName }) => {
  const getStateInfo = (state: DynamicToolUIPart["state"]): [string, string] => {
    switch (state) {
      case "output-available":
        return [
          "Complete",
          typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2),
        ];
      case "output-error":
        return ["Error", part.errorText || "Unknown error occurred"];
      case "input-streaming":
        return ["Processing", part.input ? JSON.stringify(part.input, null, 2) : "Streaming..."];
      case "input-available":
        return ["Ready", JSON.stringify(part.input, null, 2)];
      case "approval-requested":
        return ["Awaiting Approval", JSON.stringify(part.input, null, 2)];
      case "approval-responded":
        return [
          part.approval?.approved ? "Approved" : "Denied",
          JSON.stringify(part.input, null, 2),
        ];
      case "output-denied":
        return ["Denied", "Tool execution was denied"];
      default: {
        const _exhaustive: never = state;
        return ["Unknown", "Processing..."];
      }
    }
  };

  const [stateLabel, content] = getStateInfo(part.state);

  return (
    <div className="rounded-md bg-muted p-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold">Tool: {toolName}</span>
        <span className="text-muted-foreground text-[10px]">{stateLabel}</span>
      </div>
      <div className="mt-1 text-muted-foreground font-mono whitespace-pre-wrap">{content}</div>
    </div>
  );
});
ToolCallDisplay.displayName = "ToolCallDisplay";

/**
 * Renders an empty state when no messages exist
 */
const EmptyState = memo(() => (
  <div className="text-center text-muted-foreground py-12">
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
  <div
    className="rounded-md bg-destructive/10 p-4 text-destructive"
    role="alert"
    aria-live="assertive">
    <p className="font-semibold">An error occurred</p>
    <p className="text-sm mt-1">{error.message || "Please try again."}</p>
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
      <div key={index} className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{part.text}</ReactMarkdown>
      </div>
    );
  }

  // Reasoning/thinking content
  if (part.type === "reasoning") {
    return (
      <div key={index} className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        <div className="font-semibold mb-1">Reasoning</div>
        <div className="font-mono whitespace-pre-wrap text-[10px]">{part.text}</div>
      </div>
    );
  }

  // Tool calls with proper type checking using AI SDK type guards
  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    return <ToolCallDisplay key={index} part={part as DynamicToolUIPart} toolName={toolName} />;
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
        className="max-w-sm rounded-md h-auto"
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
        className="text-blue-500 hover:underline text-sm">
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
 * - Handles AbortController cleanup to prevent memory leaks
 * - Validates model on every mount (but applies update only once)
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
  const hasValidatedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Track if component is still mounted
    isMountedRef.current = true;
    const controller = new AbortController();

    const loadModels = async () => {
      try {
        const list = await fetchModels();

        // Check both abort signal and mount status
        if (controller.signal.aborted || !isMountedRef.current) return;

        setModels(list);

        // Validate selected model is still available (only once after fetch)
        if (!hasValidatedRef.current && isMountedRef.current) {
          hasValidatedRef.current = true;
          if (list.length > 0 && !list.some((m) => m.id === currentModel)) {
            onModelUpdate(list[0].id);
          }
        }
      } catch (err) {
        if (controller.signal.aborted || !isMountedRef.current) return;

        const message = err instanceof Error ? err.message : "Failed to fetch available models";
        console.error("[Chat] Model loading error:", {
          message,
          isDevelopment: process.env.NODE_ENV === "development",
        });
      }
    };

    void loadModels();

    return () => {
      controller.abort();
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array: fetch only once on mount

  const selectedModelInfo = useMemo<SelectedModelInfo>(() => {
    const selected = models.find((m) => m.id === currentModel);
    return {
      name: selected?.name ?? currentModel,
      provider: selected?.provider ?? DEFAULT_PROVIDER,
    };
  }, [models, currentModel]);

  return { models, selectedModelInfo };
}

/**
 * Memoizes grouped models by provider
 * Prevents unnecessary re-grouping on every render
 */
function useGroupedModels(models: Model[]): Record<string, Model[]> {
  return useMemo(() => {
    return models.reduce<Record<string, Model[]>>((acc, model) => {
      const provider = model.provider || "unknown";
      if (!acc[provider]) {
        acc[provider] = [];
      }
      acc[provider].push(model);
      return acc;
    }, {});
  }, [models]);
}

/**
 * Handles keyboard shortcuts in textarea (Enter to submit, Shift+Enter for newline)
 * Returns stable callback reference to prevent re-renders
 */
function useTextareaKeyboardShortcuts(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
): (e: KeyboardEvent<HTMLTextAreaElement>) => void {
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
  messages: unknown[]
): void {
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(SCROLL_AREA_VIEWPORT_SELECTOR);
    if (scrollElement instanceof HTMLElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);
}

/**
 * Auto-focus textarea on mount
 */
function useAutoFocusTextarea(textareaRef: React.RefObject<HTMLTextAreaElement | null>): void {
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);
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
  <div className="flex-1 min-h-0">
    <ScrollArea ref={scrollAreaRef} className="h-full px-4">
      <div className={`mx-auto ${CHAT_CONTAINER_MAX_WIDTH} py-8 space-y-6`}>
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
  stop: ReturnType<typeof useChat>["stop"];
  selectedModelInfo: SelectedModelInfo;
  selectorOpen: boolean;
  onSelectorOpenChange: (open: boolean) => void;
  models: Model[];
  onModelSelect: (modelId: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

const ChatInput = memo<ChatInputProps>(
  ({
    text,
    onTextChange,
    onSubmit,
    status,
    stop,
    selectedModelInfo,
    selectorOpen,
    onSelectorOpenChange,
    models,
    onModelSelect,
    textareaRef,
  }) => {
    const handleKeyDown = useTextareaKeyboardShortcuts(textareaRef);
    const groupedModels = useGroupedModels(models);

    return (
      <div className="sticky bottom-0 z-20 border-t bg-background p-4">
        <div className={`mx-auto ${CHAT_CONTAINER_MAX_WIDTH}`}>
          <PromptInput onSubmit={onSubmit} className="mt-0" globalDrop multiple>
            <AttachmentHeaderInner />

            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => onTextChange(e.target.value)}
                ref={textareaRef}
                value={text}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
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
                  className="flex items-center gap-2"
                  aria-label="Select model">
                  <ModelSelectorLogoGroup>
                    <ModelSelectorLogo provider={selectedModelInfo.provider} />
                  </ModelSelectorLogoGroup>
                  <span className="text-xs">{selectedModelInfo.name}</span>
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
                  <ModelSelectorGroup key={provider} heading={provider}>
                    {providerModels.map((model) => (
                      <ModelSelectorItem
                        key={model.id}
                        onSelect={() => {
                          onModelSelect(model.id);
                          onSelectorOpenChange(false);
                        }}>
                        <ModelSelectorLogoGroup>
                          <ModelSelectorLogo provider={model.provider || DEFAULT_PROVIDER} />
                        </ModelSelectorLogoGroup>
                        <ModelSelectorName>{model.name}</ModelSelectorName>
                      </ModelSelectorItem>
                    ))}
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
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
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
  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);

      if (!(hasText || hasAttachments)) {
        console.warn("Message submission blocked: no content");
        return;
      }

      if (status !== "ready") {
        console.debug("Message submission blocked: not ready", { status });
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
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [currentModel, status, sendMessage]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setText("");
    textareaRef.current?.focus();
  }, [setMessages]);

  return (
    <SidebarProvider>
      <Sidebar>
        <div className="flex h-full flex-col p-4">
          <div className="mb-4">
            <Button onClick={handleNewChat} className="w-full" variant="outline">
              <PlusIcon className="mr-2 size-4" />
              New Chat
            </Button>
          </div>
          {/* TODO: Add chat history list */}
        </div>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-svh max-h-svh flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b bg-background px-4 py-3 flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Chat</h1>
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
            stop={stop}
            selectedModelInfo={selectedModelInfo}
            selectorOpen={selectorOpen}
            onSelectorOpenChange={setSelectorOpen}
            models={models}
            onModelSelect={(modelId) => {
              updateSettings(["models", "defaultModel"], modelId);
            }}
            textareaRef={textareaRef}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
