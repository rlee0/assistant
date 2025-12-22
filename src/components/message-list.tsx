"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { type ChatMessage } from "@/store/chat-store";

type MessageListProps = {
  messages: ChatMessage[];
  onEdit?: (message: ChatMessage) => void;
  onCheckpoint?: () => void;
  onRestore?: () => void;
};

export function MessageList({
  messages,
  onEdit,
  onCheckpoint,
  onRestore,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-4">
      <div className="flex items-center gap-2 pb-3">
        <Badge variant="secondary">Streaming markdown</Badge>
        <Button variant="ghost" size="sm" onClick={onCheckpoint}>
          Save checkpoint
        </Button>
        <Button variant="ghost" size="sm" onClick={onRestore}>
          Restore last checkpoint
        </Button>
      </div>
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-lg border border-zinc-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {message.role}
              </span>
              {message.role === "user" ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(message)}
                >
                  Edit & resend
                </Button>
              ) : null}
            </div>
            <div className="prose prose-zinc max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {typeof message.content === "string"
                  ? message.content
                  : JSON.stringify(message.content)}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
