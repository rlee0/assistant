"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart, getToolName, type DynamicToolUIPart } from "ai";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  memo,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Message, MessageContent, MessageActions } from "@/components/ai-elements/message";
import { Spinner } from "@/components/ui/spinner";
import { StopCircleIcon, SendIcon, PlusIcon } from "lucide-react";

/** Maximum width for chat container */
const CHAT_CONTAINER_MAX_WIDTH = "max-w-3xl";

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
 * Uses inferred type from useChat return value for proper type safety
 */
const MessagePartRenderer = memo<{
  part: ReturnType<typeof useChat>["messages"][number]["parts"][number];
  index: number;
}>(({ part, index }) => {
  if (part.type === "text") {
    return (
      <div key={index} className="whitespace-pre-wrap">
        {part.text}
      </div>
    );
  }

  // Handle tool parts with proper type checking using AI SDK type guards
  if (isToolUIPart(part)) {
    const toolName = getToolName(part);
    return <ToolCallDisplay key={index} part={part as DynamicToolUIPart} toolName={toolName} />;
  }

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
    }),
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (input.trim() && status === "ready") {
        sendMessage({ text: input });
        setInput("");
      }
    },
    [input, status, sendMessage]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as FormEvent<HTMLFormElement>);
      }
    },
    [handleSubmit]
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
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
          {/* Future: Add chat history list here */}
        </div>
      </Sidebar>

      <SidebarInset>
        <div className="flex h-screen flex-col">
          {/* Header */}
          <header className="border-b px-4 py-3 flex items-center gap-2">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">Chat</h1>
          </header>

          {/* Messages Area */}
          <ScrollArea ref={scrollAreaRef} className="flex-1 px-4">
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

              {/* Error state */}
              {error && <ErrorDisplay error={error} />}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className={`mx-auto ${CHAT_CONTAINER_MAX_WIDTH}`}>
              <div className="relative flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                  disabled={status !== "ready"}
                  className="min-h-15 max-h-50 resize-none"
                  rows={2}
                />

                {status === "submitted" || status === "streaming" ? (
                  <Button
                    type="button"
                    onClick={stop}
                    variant="destructive"
                    size="icon"
                    className="shrink-0">
                    <StopCircleIcon className="size-5" />
                    <span className="sr-only">Stop</span>
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={!input.trim() || status !== "ready"}
                    size="icon"
                    className="shrink-0">
                    <SendIcon className="size-5" />
                    <span className="sr-only">Send</span>
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
