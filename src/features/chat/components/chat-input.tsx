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
import { LAYOUT, OVERFLOW, SIZE, SPACING, TEXT } from "@/styles/constants";
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
import { Suggestion, Suggestions } from "@/components/ai/suggestion";
import { formatProviderName, getModelProvider } from "@/lib/models";
import { memo, useEffect, useRef, useState } from "react";
import { useGroupedModels, useTextareaKeyboardShortcuts } from "../hooks/use-chat-hooks";

import { Badge } from "@/components/ui/badge";
import type { ChatInputProps } from "../types";
import { ModelSelectorSkeleton } from "@/components/skeletons/sidebar-skeleton";
import { cn } from "@/lib/utils";
import { mapUseChatStatus } from "../utils/message-utils";

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
    suggestions,
    onSuggestionClick,
    editingMessageId,
  }) => {
    const handleKeyDown = useTextareaKeyboardShortcuts();
    const groupedModels = useGroupedModels(models);
    const [searchValue, setSearchValue] = useState("");
    const searchInputRef = useRef<HTMLInputElement>(null);

    // When the selector opens, set the search to the current provider name and select all text
    useEffect(() => {
      if (selectorOpen) {
        // Use setTimeout to ensure the input is rendered and can be selected
        setTimeout(() => {
          setSearchValue(formatProviderName(selectedModelInfo.provider));
          if (searchInputRef.current) {
            searchInputRef.current.select();
          }
        }, 0);
      } else {
        setTimeout(() => setSearchValue(""), 0);
      }
    }, [selectorOpen, selectedModelInfo.provider]);

    return (
      <div className={CSS_CLASSES.inputContainer}>
        <div className={cn(SIZE.wFull, "mx-auto", CHAT_CONTAINER_MAX_WIDTH)}>
          {/* Show suggestions when idle and not editing */}
          {mapUseChatStatus(status) === "idle" &&
            !editingMessageId &&
            suggestions &&
            suggestions.length > 0 && (
              <div className="w-full pb-4">
                <Suggestions>
                  {suggestions.map((suggestion) => (
                    <Suggestion
                      key={suggestion}
                      suggestion={suggestion}
                      onClick={onSuggestionClick}
                    />
                  ))}
                </Suggestions>
              </div>
            )}

          <PromptInput onSubmit={onSubmit} className={SPACING.mt0} globalDrop multiple>
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
              <ModelSelectorInput
                placeholder="Search models..."
                value={searchValue}
                onValueChange={setSearchValue}
                ref={searchInputRef}
              />
              <ModelSelectorList>
                <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                {Object.entries(groupedModels).map(([provider, providerModels]) => (
                  <ModelSelectorGroup key={provider} heading={formatProviderName(provider)}>
                    {providerModels.map((model) => {
                      const isSelected = model.id === currentModel;
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
                          <div
                            className={`${LAYOUT.flexRow} flex-1 items-baseline ${SPACING.gap2} ${OVERFLOW.hidden}`}>
                            <ModelSelectorName className="flex-none">
                              {model.name}
                            </ModelSelectorName>
                            <span className={CSS_CLASSES.modelId}>({model.id})</span>
                            {model.tags && model.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {model.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className={`${TEXT.xs} ${TEXT.normal}`}>
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check className={`ml-auto ${SIZE.size4} shrink-0 ${TEXT.primary}`} />
                          )}
                        </ModelSelectorItem>
                      );
                    })}
                  </ModelSelectorGroup>
                ))}
              </ModelSelectorList>
            </ModelSelectorContent>
          </ModelSelector>
          <div className={`${TEXT.center} ${TEXT.xs} ${TEXT.muted} ${SPACING.p2}`}>
            AI can make mistakes, so please verify its responses.
          </div>
        </div>
      </div>
    );
  }
);
ChatInput.displayName = "ChatInput";
