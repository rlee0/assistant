"use client";

import { CHAT_CONTAINER_MAX_WIDTH, CSS_CLASSES } from "@/features/chat/constants";
import { Check, Square } from "lucide-react";
import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@/components/ai/context";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
} from "@/components/ai/model-selector";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSpeechButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@/components/ai/prompt-input";
import { formatProviderName, getModelProvider } from "@/lib/models";
import { useGroupedModels, useTextareaKeyboardShortcuts } from "../use-chat-hooks";

import { Badge } from "@/components/ui/badge";
import type { ChatInputProps } from "../types";
import { ModelSelectorSkeleton } from "@/components/skeletons/sidebar-skeleton";
import { cn } from "@/lib/utils";
import { memo } from "react";

/**
 * Internal component that uses PromptInput attachment hook.
 * Must be rendered within PromptInput context.
 *
 * Note: Not memoized as it's a trivial component with minimal render cost.
 */
function AttachmentHeaderInner() {
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
}

/**
 * Chat input area with model selector, attachments, and keyboard shortcuts
 */
export const ChatInput = memo<ChatInputProps>(
  ({
    text,
    onTextChange,
    onSubmit,
    onStop,
    status,
    selectedModelInfo,
    currentModel,
    selectorOpen,
    onSelectorOpenChange,
    models,
    modelsLoading,
    onModelSelect,
    textareaRef,
    totalUsedTokens,
    totalUsage,
  }) => {
    const handleKeyDown = useTextareaKeyboardShortcuts();
    const groupedModels = useGroupedModels(models);

    return (
      <div className={CSS_CLASSES.inputContainer}>
        <div className={cn("w-full mx-auto", CHAT_CONTAINER_MAX_WIDTH)}>
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

                <Context
                  usedTokens={totalUsedTokens}
                  maxTokens={128000}
                  usage={totalUsage}
                  modelId={currentModel}>
                  <ContextTrigger />
                  <ContextContent>
                    <ContextContentHeader />
                    <ContextContentBody>
                      <ContextInputUsage />
                      <ContextOutputUsage />
                      <ContextReasoningUsage />
                      <ContextCacheUsage />
                    </ContextContentBody>
                    <ContextContentFooter />
                  </ContextContent>
                </Context>

                <PromptInputButton
                  variant="ghost"
                  onClick={() => onSelectorOpenChange(true)}
                  className={CSS_CLASSES.modelButton}
                  disabled={modelsLoading}
                  aria-label="Select model">
                  {modelsLoading ? (
                    <ModelSelectorSkeleton />
                  ) : (
                    <>
                      <ModelSelectorLogoGroup>
                        <ModelSelectorLogo provider={selectedModelInfo.provider} />
                      </ModelSelectorLogoGroup>
                      <span className={CSS_CLASSES.modelName}>{selectedModelInfo.name}</span>
                    </>
                  )}
                </PromptInputButton>
              </PromptInputTools>

              {status === "streaming" || status === "submitted" ? (
                <PromptInputButton
                  onClick={onStop}
                  aria-label="Stop message generation"
                  variant="destructive"
                  type="button">
                  <Square className="size-4 fill-current" />
                </PromptInputButton>
              ) : (
                <PromptInputSubmit disabled={!text} status={status} />
              )}
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
                      const hasReasoning = model.tags?.includes("reasoning") ?? false;
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
                            {hasReasoning && (
                              <Badge variant="secondary" className="text-xs font-normal">
                                reasoning
                              </Badge>
                            )}
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
          <div className="text-center text-xs text-muted-foreground p-2">
            AI can make mistakes, so please verify its responses.
          </div>
        </div>
      </div>
    );
  }
);
ChatInput.displayName = "ChatInput";
