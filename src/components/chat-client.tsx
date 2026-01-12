"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type DynamicToolUIPart } from "ai";
import { useState, useRef, useEffect, useCallback, memo, type KeyboardEvent } from "react";
import Image from "next/image";
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
  ModelSelectorDialog,
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

/**
 * Renders a tool call with its current state
 */
const ToolCallDisplay = memo<{
  part: DynamicToolUIPart;
  toolName: string;
}>(({ part, toolName }) => {
  let content: string;
  let stateLabel: string;

  switch (part.state) {
    case "output-available":
      stateLabel = "Complete";
      content =
        typeof part.output === "string" ? part.output : JSON.stringify(part.output, null, 2);
      break;
    case "output-error":
      stateLabel = "Error";
      content = part.errorText || "Unknown error occurred";
      break;
    case "input-streaming":
      stateLabel = "Processing";
      content = part.input ? JSON.stringify(part.input, null, 2) : "Streaming...";
      break;
    case "input-available":
      stateLabel = "Ready";
      content = JSON.stringify(part.input, null, 2);
      break;
    case "approval-requested":
      stateLabel = "Awaiting Approval";
      content = JSON.stringify(part.input, null, 2);
      break;
    case "approval-responded":
      stateLabel = part.approval.approved ? "Approved" : "Denied";
      content = JSON.stringify(part.input, null, 2);
      break;
    case "output-denied":
      stateLabel = "Denied";
      content = "Tool execution was denied";
      break;
    default:
      stateLabel = "Unknown";
      content = "Processing...";
  }

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
 * Renders a message part based on its type
 * Uses proper type checking with AI SDK type guards for all part types
 */
const MessagePartRenderer = memo<{
  part: ReturnType<typeof useChat>["messages"][number]["parts"][number];
  index: number;
}>(({ part, index }) => {
  // Text content
  if (part.type === "text") {
    return (
      <div key={index} className="whitespace-pre-wrap">
        {part.text}
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

/**
 * Main chat interface component using AI SDK UI
 *
 * Features:
 * - Real-time streaming responses
 * - Tool calling support
 * - File attachments (images)
 * - Keyboard shortcuts
 * - Auto-scrolling
 * - Error handling
 */
export function ChatClient() {
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      credentials: "include",
    }),
    onError: (error) => {
      // Log error for debugging (mask details from user)
      console.error("Chat error:", error);
    },
    onFinish: (result) => {
      // Callback for when message streaming completes
      if (result.isError) {
        console.error("Message streaming failed");
      }
    },
  });

  // ----- Input + model state
  const [text, setText] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Get model from settings store and sync with server
  useSettingsSync();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.update);
  const model = settings.models.defaultModel;

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load models from AI Gateway (with fallback handled in fetchModels)
  // Runs once on mount to populate available models
  useEffect(() => {
    const controller = new AbortController();

    fetchModels()
      .then((list) => {
        if (controller.signal.aborted) return;
        setModels(list);

        // Validate selected model is still available
        const availableModelIds = new Set(list.map((m) => m.id));
        const currentModel = settings.models.defaultModel;

        if (!availableModelIds.has(currentModel) && list.length > 0) {
          updateSettings(["models", "defaultModel"], list[0].id);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === "development" && !controller.signal.aborted) {
          console.error(
            "Failed to fetch models:",
            error instanceof Error ? error.message : String(error)
          );
        }
      });

    return () => {
      controller.abort();
    };
  }, [settings.models.defaultModel, updateSettings]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector(SCROLL_AREA_VIEWPORT_SELECTOR);
    if (scrollElement instanceof HTMLElement) {
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages]);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handlePromptSubmit = useCallback(
    (message: PromptInputMessage) => {
      const hasText = Boolean(message.text);
      const hasAttachments = Boolean(message.files?.length);
      if (!(hasText || hasAttachments) || status !== "ready") {
        return;
      }

      sendMessage(
        {
          text: message.text || "Sent with attachments",
          files: message.files,
        },
        {
          body: {
            model,
          },
        }
      );

      setText("");
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    },
    [model, status, sendMessage]
  );

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Trigger form submit via PromptInput
      const form = e.currentTarget.form;
      form?.requestSubmit();
    }
  }, []);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setText("");
    textareaRef.current?.focus();
  }, [setMessages]);

  // Memoize selected model info to avoid redundant array lookups
  const selectedModel = models.find((m) => m.id === model);
  const selectedModelName = selectedModel?.name || model;
  const selectedModelProvider = selectedModel?.provider || DEFAULT_PROVIDER;

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
          {/* Future: Add chat history list here */}
        </div>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-svh max-h-svh flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b bg-background px-4 py-3 flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Chat</h1>
          </header>

          {/* Messages Area */}
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

                {/* Loading state */}
                {status === "submitted" && <LoadingState />}

                {/* Error state with retry action */}
                {error && (
                  <div className="space-y-3">
                    <ErrorDisplay error={error} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="sticky bottom-0 z-20 border-t bg-background p-4">
            <div className={`mx-auto ${CHAT_CONTAINER_MAX_WIDTH}`}>
              <PromptInput
                onSubmit={(message) => handlePromptSubmit(message)}
                className="mt-0"
                globalDrop
                multiple>
                {/* Conditionally render header only when there are attachments */}
                <AttachmentHeaderInner />

                <PromptInputBody>
                  <PromptInputTextarea
                    onChange={(e) => setText(e.target.value)}
                    ref={textareaRef}
                    value={text}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  />
                </PromptInputBody>

                <PromptInputFooter>
                  <PromptInputTools>
                    {/* Action menu for attachments */}
                    <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu>

                    {/* Speech input */}
                    <PromptInputSpeechButton
                      onTranscriptionChange={setText}
                      textareaRef={textareaRef}
                    />

                    {/* Model selector dialog trigger */}
                    <PromptInputButton
                      variant="ghost"
                      onClick={() => setSelectorOpen(true)}
                      className="flex items-center gap-2"
                      aria-label="Select model">
                      <ModelSelectorLogoGroup>
                        <ModelSelectorLogo provider={selectedModelProvider} />
                      </ModelSelectorLogoGroup>
                      <span className="text-xs">{selectedModelName}</span>
                    </PromptInputButton>

                    {/* Stop button during streaming */}
                    {(status === "submitted" || status === "streaming") && (
                      <PromptInputButton variant="destructive" onClick={stop} aria-label="Stop">
                        <StopCircleIcon className="size-4" />
                      </PromptInputButton>
                    )}
                  </PromptInputTools>

                  <PromptInputSubmit disabled={!text && status !== "streaming"} status={status} />
                </PromptInputFooter>
              </PromptInput>

              {/* Model Selector dialog */}
              <ModelSelectorDialog open={selectorOpen} onOpenChange={setSelectorOpen}>
                <ModelSelectorInput placeholder="Search models..." />
                <ModelSelectorList>
                  <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                  {Object.entries(
                    models.reduce<Record<string, Model[]>>((acc, m) => {
                      const key = m.provider || "provider";
                      (acc[key] ||= []).push(m);
                      return acc;
                    }, {})
                  ).map(([provider, group]) => (
                    <ModelSelectorGroup key={provider} heading={provider}>
                      {group.map((m) => (
                        <ModelSelectorItem
                          key={m.id}
                          onSelect={() => {
                            updateSettings(["models", "defaultModel"], m.id);
                            setSelectorOpen(false);
                          }}>
                          <ModelSelectorLogoGroup>
                            <ModelSelectorLogo provider={m.provider || DEFAULT_PROVIDER} />
                          </ModelSelectorLogoGroup>
                          <ModelSelectorName>{m.name}</ModelSelectorName>
                        </ModelSelectorItem>
                      ))}
                    </ModelSelectorGroup>
                  ))}
                </ModelSelectorList>
              </ModelSelectorDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
