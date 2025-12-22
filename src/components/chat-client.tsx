"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
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

  const { messages, input, handleInputChange, handleSubmit, setMessages, isLoading } =
    useChat({
      api: "/api/chat",
      id: selectedId ?? "default",
      body: useMemo(
        () => ({
          chatId: selectedId,
          model: chat?.model,
          context: chat?.context,
        }),
        [selectedId, chat?.model, chat?.context]
      ),
      initialMessages: chat?.messages ?? [],
    });

  useEffect(() => {
    if (initialChats && !hydrated) {
      hydrate(initialChats);
    }
  }, [hydrate, hydrated, initialChats]);

  const setInputValue = useCallback(
    (value: string) =>
      handleInputChange({
        target: { value },
      } as unknown as ChangeEvent<HTMLTextAreaElement>),
    [handleInputChange]
  );

  useEffect(() => {
    if (chat) {
      setMessages(chat.messages);
      setInputValue("");
    }
  }, [chat, setMessages, setInputValue]);

  useEffect(() => {
    if (!chat) return;
    const stamped: ChatMessage[] = messages.map((m) => ({
      ...m,
      id: (m as ChatMessage).id ?? uuid(),
      createdAt: (m as ChatMessage).createdAt ?? new Date().toISOString(),
    }));
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
          }}
        >
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
          onSignOut={async () => {
            if (!supabase) return;
            await supabase.auth.signOut();
            window.location.href = "/login";
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
                  setMessages(filtered);
                  setInputValue(
                    typeof message.content === "string"
                      ? message.content
                      : JSON.stringify(message.content)
                  );
                }}
                onCheckpoint={() => {
                  addCheckpoint(chat.id);
                  const checkpoint =
                    useChatStore.getState().chats[chat.id]?.checkpoints.at(-1);
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
                  {chat.context ??
                    "Add important details to guide the assistant for this chat."}
                </p>
              </div>
            </div>
          </div>
          <PromptArea
            input={input}
            setInput={setInputValue}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
