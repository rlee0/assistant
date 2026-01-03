"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { v4 as uuid } from "uuid";
import { Sidebar } from "@/components/sidebar";
import { ChatToolbar } from "@/components/chat-toolbar";
import { MessageList } from "@/components/message-list";
import { PromptArea } from "@/components/prompt-area";
import { CanvasPanel } from "@/components/canvas-panel";
import { useChatStore, type ChatMessage } from "@/store/chat-store";
import { Button } from "@/components/ui/button";
import {
  persistChat,
  persistMessages,
  persistCheckpoint,
  deleteChatCascade,
} from "@/lib/supabase/persistence";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import type { InitialChatData } from "@/lib/supabase/loaders";

type ChatClientProps = {
  initialChats?: InitialChatData;
};

function areChatMessagesEqual(a: ChatMessage[], b: ChatMessage[]) {
  if (a.length !== b.length) return false;

  return a.every((message, index) => {
    const other = b[index];
    if (!other) return false;
    if (message.id !== other.id || message.role !== other.role) {
      return false;
    }
    return JSON.stringify(message.content) === JSON.stringify(other.content);
  });
}

export function ChatClient({ initialChats }: ChatClientProps) {
  const {
    chats,
    selectedId,
    hydrate,
    hydrated,
    addChat,
    updateMessages,
    addCheckpoint,
    restoreCheckpoint,
    updateTitle,
    deleteChat,
  } = useChatStore();

  const chat = selectedId ? chats[selectedId] : undefined;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  const { messages, sendMessage, setMessages, status } = useChat({});

  const [inputByChat, setInputByChat] = useState<Record<string, string>>({});
  const activeChatKey = selectedId ?? "default";
  const inputValue = inputByChat[activeChatKey] ?? "";
  const setInputValue = useCallback(
    (value: string) => {
      setInputByChat((prev) => ({
        ...prev,
        [activeChatKey]: value,
      }));
    },
    [activeChatKey]
  );
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (initialChats && !hydrated) {
      hydrate(initialChats);
    }
  }, [hydrate, hydrated, initialChats]);

  const handlePromptSubmit = useCallback(
    (
      message: {
        text: string;
        files?: Array<{ url: string; mediaType?: string; filename?: string }>;
      },
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();
      if (!message.text.trim()) {
        return;
      }
      sendMessage({ text: message.text });
      setInputValue("");
    },
    [sendMessage, setInputValue]
  );

  useEffect(() => {
    if (!chat) return;
    const stamped: ChatMessage[] = messages.map((m: any) => {
      // Convert new message format (with parts) to old format (with content)
      let content: unknown = "";
      if (Array.isArray(m.parts)) {
        // Extract text content from parts
        const textParts = m.parts
          .filter((p: any) => p && typeof p === "object" && p.type === "text")
          .map((p: any) => p.text)
          .filter(Boolean);
        content = textParts.length > 0 ? textParts.join("\n") : "";
      }
      return {
        role: m.role as "user" | "assistant" | "system",
        content,
        id: m.id ?? uuid(),
        createdAt: m.createdAt ?? new Date().toISOString(),
      } as ChatMessage;
    });
    if (areChatMessagesEqual(chat.messages ?? [], stamped)) {
      return;
    }
    updateMessages(chat.id, stamped);
    updateTitle(chat.id);
    if (supabase) {
      void persistChat(chat);
      void persistMessages(chat.id, stamped);
    }
  }, [messages, chat, updateMessages, updateTitle, supabase]);

  useEffect(() => {
    if (!chat || !supabase) return;
    void persistChat(chat);
  }, [chat, supabase]);

  if (!chat) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Button
          onClick={() => {
            const id = addChat();
            const created = useChatStore.getState().chats[id];
            void persistChat(created);
          }}>
          Create a new chat
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 text-zinc-900">
      {sidebarOpen && (
        <Sidebar
          onNewChat={() => {
            const id = addChat();
            const created = useChatStore.getState().chats[id];
            void persistChat(created);
          }}
          onDelete={async (id) => {
            deleteChat(id);
            await deleteChatCascade(id);
          }}
          onLogOut={async () => {
            if (!supabase) return;
            await supabase.auth.signOut();
            window.location.href = "/signup";
          }}
        />
      )}
      <div className="flex flex-1 flex-col">
        <ChatToolbar onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="grid h-full grid-rows-[1fr_auto]">
          <div className="grid h-full grid-cols-[2fr_1fr] gap-4 overflow-hidden px-6 py-4">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <MessageList
                messages={chat.messages}
                onEdit={(message) => {
                  const filtered = chat.messages.filter((m) => m.id !== message.id);
                  // Convert back to new format for setMessages
                  const convertedMessages = filtered.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    parts: [{ type: "text" as const, text: m.content ?? "" }],
                  }));
                  setMessages(convertedMessages as any);
                  setInputValue(getMessageText(message.content));
                }}
                onCheckpoint={() => {
                  addCheckpoint(chat.id);
                  const checkpoint = useChatStore.getState().chats[chat.id]?.checkpoints.at(-1);
                  if (checkpoint && supabase) {
                    void persistCheckpoint(chat.id, checkpoint);
                  }
                }}
                onRestore={() => restoreCheckpoint(chat.id)}
              />
            </div>
            <div className="flex h-full flex-col gap-4 overflow-hidden">
              <CanvasPanel />
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-zinc-800">Context</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {chat.context ?? "Add important details to guide the assistant for this chat."}
                </p>
              </div>
            </div>
          </div>
          <PromptArea
            input={inputValue}
            setInput={setInputValue}
            onSubmitMessage={handlePromptSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const parts = content
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object") {
          const anyPart = p as Record<string, unknown>;
          if (typeof anyPart.text === "string") return anyPart.text;
          if (typeof anyPart.content === "string") return anyPart.content;
        }
        return "";
      })
      .filter((s) => s && s.trim().length > 0);
    if (parts.length > 0) return parts.join("\n\n");
    return JSON.stringify(content);
  }
  if (content && typeof content === "object") {
    const anyObj = content as Record<string, unknown>;
    if (typeof anyObj.text === "string") return anyObj.text;
    if (typeof anyObj.content === "string") return anyObj.content;
  }
  return "";
}
