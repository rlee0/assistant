"use client";

import { type ChatMessage } from "@/store/chat-store";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageToolbar,
} from "@/components/ai-elements/message";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageListProps = {
  messages: ChatMessage[];
  onEdit?: (message: ChatMessage) => void;
  onCheckpoint?: () => void;
  onRestore?: () => void;
};

export function MessageList({ messages, onEdit, onCheckpoint, onRestore }: MessageListProps) {
  return (
    <div className="relative flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState title="No messages yet" description="Start a conversation to see messages here" />
          ) : (
            messages
              .filter((message) => message.role === "user" || message.role === "assistant")
              .map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {getMessageText(message.content ?? "")}
                    </ReactMarkdown>
                  </div>
                </MessageContent>
                <MessageToolbar>
                  {message.role === "user" ? (
                    <button
                      onClick={() => onEdit?.(message)}
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Edit & resend
                    </button>
                  ) : null}
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      onClick={onCheckpoint}
                      className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Save checkpoint"
                    >
                      Save
                    </button>
                    <span className="text-xs text-zinc-400">·</span>
                    <button
                      onClick={onRestore}
                      className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Restore last checkpoint"
                    >
                      Restore
                    </button>
                  </div>
                </MessageToolbar>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

function getMessageText(content: unknown): string {
  // Handle null/undefined
  if (content == null) {
    console.warn("Message content is null/undefined");
    return "";
  }

  // Handle string
  if (typeof content === "string") {
    if (!content || content.trim() === "") {
      console.warn("Message content is empty string");
    }
    return content;
  }

  // Handle array
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const anyPart = p as Record<string, unknown>;
          const t = typeof anyPart.type === "string" ? (anyPart.type as string) : undefined;
          if ((t === "text" || t === "input_text") && typeof anyPart.text === "string") {
            return anyPart.text;
          }
          if (typeof anyPart.text === "string") return anyPart.text;
          if (typeof anyPart.content === "string") return anyPart.content;
        }
        return "";
      })
      .filter((s) => s && s.trim().length > 0);
    if (parts.length > 0) return parts.join("\n\n");
    console.warn("Could not extract text from array content:", content);
    return JSON.stringify(content);
  }

  // Handle object
  if (content && typeof content === "object") {
    const anyObj = content as Record<string, unknown>;
    if (typeof anyObj.text === "string") return anyObj.text;
    if (typeof anyObj.content === "string") return anyObj.content;
  }

  // Fallback
  console.warn("Could not parse message content:", content);
  try {
    return JSON.stringify(content ?? "");
  } catch {
    return String(content ?? "");
  }
}
