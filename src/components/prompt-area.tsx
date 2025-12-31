"use client";

import { useEffect, useState, FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { fetchModels, type Model } from "@/lib/models";
import { useChatStore } from "@/store/chat-store";
import {
  PromptInputProvider,
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputActionAddAttachments,
  PromptInputAttachments,
  PromptInputAttachment,
  usePromptInputController,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  ModelSelector,
  ModelSelectorTrigger,
  ModelSelectorContent,
  ModelSelectorInput,
  ModelSelectorList,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorItem,
} from "@/components/ai-elements/model-selector";
import { Badge } from "./ui/badge";

type PromptAreaProps = {
  input: string;
  setInput: (v: string) => void;
  onSubmitMessage: (message: PromptInputMessage, e: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
};

export function PromptArea({ input, setInput, onSubmitMessage, isLoading }: PromptAreaProps) {
  const { selectedId, chats, setModel } = useChatStore();
  const chat = selectedId ? chats[selectedId] : undefined;
  const [models, setModels] = useState<Model[]>([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);

  useEffect(() => {
    fetchModels()
      .then(setModels)
      .finally(() => setLoadingModels(false));
  }, []);

  if (!chat) return null;

  return (
    <div className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white p-4 shadow-[0_-6px_12px_-12px_rgba(0,0,0,0.25)]">
      <PromptInputProvider initialInput={input}>
        <Suggestions setInput={setInput} suggestions={chat.suggestions} />
        <PromptInput onSubmit={onSubmitMessage} className="mt-2" globalDrop>
          <PromptInputBody>
            <PromptInputAttachmentsDisplay />
            <PromptInputTextarea
              placeholder="Ask anything…"
              onChange={(e) => setInput(e.target.value)}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <PromptInputButton variant="ghost" size="icon-sm">
                    🔗
                  </PromptInputButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuGroup>
                    <PromptInputActionAddAttachments />
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <ModelSelector open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
                <ModelSelectorTrigger asChild>
                  <PromptInputButton variant="outline">
                    <Badge variant="outline" className="pointer-events-none">
                      {loadingModels
                        ? "Loading…"
                        : models.find((m) => m.id === chat.model)?.label || "Select model"}
                    </Badge>
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models…" />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found</ModelSelectorEmpty>
                    <ModelSelectorGroup heading="Available Models">
                      {loadingModels ? (
                        <ModelSelectorItem disabled>Loading models…</ModelSelectorItem>
                      ) : (
                        models.map((m) => (
                          <ModelSelectorItem
                            key={m.id}
                            value={m.id}
                            onSelect={() => {
                              setModel(chat.id, m.id);
                              setModelDialogOpen(false);
                            }}>
                            {m.label}
                          </ModelSelectorItem>
                        ))
                      )}
                    </ModelSelectorGroup>
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <PromptInputSubmit status={isLoading ? "submitted" : undefined} />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}

function Suggestions({
  suggestions,
  setInput,
}: {
  suggestions: string[];
  setInput: (v: string) => void;
}) {
  const controller = usePromptInputController();
  if (!suggestions.length) return null;
  return (
    <PromptInputHeader>
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span className="font-medium">Suggestions:</span>
        {suggestions.map((s) => (
          <PromptInputButton
            key={s}
            variant="ghost"
            size="sm"
            onClick={() => {
              setInput(s);
              controller.textInput.setInput(s);
            }}>
            {s}
          </PromptInputButton>
        ))}
      </div>
    </PromptInputHeader>
  );
}

function PromptInputAttachmentsDisplay() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return (
    <PromptInputAttachments>
      {(file) => <PromptInputAttachment key={file.id} data={file} />}
    </PromptInputAttachments>
  );
}
