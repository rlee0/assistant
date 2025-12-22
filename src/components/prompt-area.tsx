"use client";

import { FormEvent, useEffect, useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { fetchModels, type Model } from "@/lib/models";
import { useChatStore } from "@/store/chat-store";

type PromptAreaProps = {
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
};

export function PromptArea({
  input,
  setInput,
  onSubmit,
  isLoading,
}: PromptAreaProps) {
  const { selectedId, chats, setModel } = useChatStore();
  const chat = selectedId ? chats[selectedId] : undefined;
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .finally(() => setLoadingModels(false));
  }, []);

  if (!chat) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-zinc-200 bg-white p-4 shadow-[0_-6px_12px_-12px_rgba(0,0,0,0.25)]"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span className="font-medium">Suggestions:</span>
        {chat.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setInput(s)}
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs hover:bg-zinc-200"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything…"
            className="min-h-[120px]"
          />
          {chat.context ? (
            <p className="mt-2 text-xs text-zinc-500">
              Context: {chat.context}
            </p>
          ) : null}
        </div>
        <div className="flex w-56 flex-col gap-2">
          <label className="text-xs font-medium text-zinc-600">
            Model
            <select
              className="mt-1 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
              value={chat.model}
              onChange={(e) => setModel(chat.id, e.target.value)}
            >
              {loadingModels ? (
                <option>Loading models…</option>
              ) : (
                models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <Button type="submit" loading={isLoading}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </form>
  );
}
