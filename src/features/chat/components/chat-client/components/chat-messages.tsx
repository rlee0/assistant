"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Copy, Edit2, RefreshCcw, Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CHAT_CONTAINER_MAX_WIDTH,
  CSS_CLASSES,
  EDIT_INPUT_MIN_WIDTH,
  EDIT_PLACEHOLDER,
  TOAST_MESSAGES,
} from "@/features/chat/constants";
import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "@/components/ai/checkpoint";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai/conversation";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Message, MessageAction, MessageActions, MessageContent } from "@/components/ai/message";
import { MessagePartRenderer, SourcesRenderer } from "./message-renderers";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai/prompt-input";
import { memo, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { ChatMessagesProps } from "../types";
import { Loader } from "@/components/ai/loader";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "../clipboard";
import { logError } from "@/lib/logging";
import { toast } from "sonner";
import { useStickToBottomContext } from "use-stick-to-bottom";

/**
 * Captures the scrollToBottom function from Conversation context and stores it in a ref
 */
const ScrollToBottomCapture = memo<{
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
}>(({ scrollToBottomRef }) => {
  const { scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
    return () => {
      scrollToBottomRef.current = null;
    };
  }, [scrollToBottom, scrollToBottomRef]);

  return null;
});
ScrollToBottomCapture.displayName = "ScrollToBottomCapture";

/**
 * Displays all messages in the conversation with edit, delete, and regenerate actions
 */
export const ChatMessages = memo<ChatMessagesProps>(
  ({
    messages,
    status,
    error,
    messagesContainerRef,
    editingMessageId,
    editText,
    hydrated,
    scrollToBottomRef,
    checkpoints,
    selectedId,
    onNewChat,
    onEditMessage,
    onCancelEdit,
    onSaveEdit,
    onDeleteMessage,
    onEditTextChange,
    onRegenerateFromMessage,
    onRestoreCheckpoint,
  }) => {
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea and set cursor to end when entering edit mode
    useEffect(() => {
      if (editingMessageId && editTextareaRef.current) {
        const textarea = editTextareaRef.current;
        // Use queueMicrotask to ensure DOM update after state change
        queueMicrotask(() => {
          textarea.focus();
          // Set cursor to end of text
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
      }
    }, [editingMessageId, editText]);

    return (
      <div className={CSS_CLASSES.messagesContainer} ref={messagesContainerRef}>
        <Conversation>
          <ConversationContent>
            <div className={cn("w-full", CSS_CLASSES.messagesInner, CHAT_CONTAINER_MAX_WIDTH)}>
              {!hydrated ? null : !selectedId ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>No Chat Selected</EmptyTitle>
                    <EmptyDescription>
                      Create a new chat or select an existing one to begin.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={onNewChat}>New Chat</Button>
                  </EmptyContent>
                </Empty>
              ) : messages.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Start a Conversation</EmptyTitle>
                    <EmptyDescription>Type a message below to begin chatting.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  {messages.map((message, messageIndex) => {
                    // Check if there's a checkpoint at this message index
                    const checkpointAtIndex = checkpoints.find(
                      (cp) => cp.messageIndex === messageIndex
                    );

                    const isEditing = message.id === editingMessageId;
                    const isAfterEditedMessage =
                      editingMessageId &&
                      messageIndex > messages.findIndex((m) => m.id === editingMessageId);

                    // Validate message.parts is an array before accessing
                    const parts = Array.isArray(message.parts) ? message.parts : [];

                    // Extract text content for copy and edit functionality
                    const textParts = parts
                      .filter((part) => (part as Record<string, unknown>).type === "text")
                      .map((part) => (part as Record<string, unknown>).text)
                      .join("\n");

                    const hasTextToCopy = textParts.trim().length > 0;

                    return (
                      <div key={messageIndex} className="group flex flex-col gap-2">
                        {/* Checkpoint line appears on hover */}
                        {checkpointAtIndex && (
                          <Checkpoint className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                            <CheckpointIcon />
                            <CheckpointTrigger
                              messageIndex={messageIndex}
                              totalMessages={messages.length}
                              onRestore={() => onRestoreCheckpoint(checkpointAtIndex.id)}>
                              Restore Checkpoint
                            </CheckpointTrigger>
                          </Checkpoint>
                        )}

                        <Message
                          from={message.role}
                          className={isAfterEditedMessage ? "opacity-50 transition-opacity" : ""}>
                          <MessageContent>
                            {isEditing && message.role === "user" ? (
                              <PromptInput
                                onSubmit={() => {
                                  if (editText.trim()) {
                                    onSaveEdit(message.id, editText);
                                  }
                                }}
                                className={cn("w-full", EDIT_INPUT_MIN_WIDTH)}>
                                <PromptInputBody>
                                  <PromptInputTextarea
                                    ref={editTextareaRef}
                                    value={editText}
                                    onChange={(e) => onEditTextChange(e.target.value)}
                                    placeholder={EDIT_PLACEHOLDER}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        if (editText.trim()) {
                                          onSaveEdit(message.id, editText);
                                        }
                                      }
                                      if (e.key === "Escape") {
                                        e.preventDefault();
                                        onCancelEdit();
                                      }
                                    }}
                                  />
                                </PromptInputBody>
                                <PromptInputFooter>
                                  <PromptInputTools>
                                    <PromptInputButton
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={onCancelEdit}>
                                      <X className="size-4" />
                                    </PromptInputButton>
                                  </PromptInputTools>
                                  <PromptInputSubmit disabled={!editText.trim()} status="ready" />
                                </PromptInputFooter>
                              </PromptInput>
                            ) : (
                              <>
                                {parts.map((part, index) => {
                                  // Determine if this part is actively streaming
                                  const isStreaming =
                                    status === "streaming" &&
                                    index === parts.length - 1 &&
                                    message.id === messages.at(-1)?.id;
                                  return (
                                    <MessagePartRenderer
                                      key={index}
                                      part={part}
                                      index={index}
                                      isStreaming={isStreaming}
                                    />
                                  );
                                })}
                                <SourcesRenderer parts={parts} />
                              </>
                            )}
                          </MessageContent>

                          {!isEditing && message.role === "assistant" && (
                            <MessageActions>
                              <MessageAction
                                onClick={async () => {
                                  if (!hasTextToCopy) {
                                    toast.error(TOAST_MESSAGES.COPY_ERROR);
                                    return;
                                  }

                                  try {
                                    await copyToClipboard(textParts);
                                    toast.success(TOAST_MESSAGES.COPY_SUCCESS);
                                  } catch (error) {
                                    logError("[Chat]", "Copy to clipboard failed", error, {
                                      textLength: textParts.length,
                                    });
                                    toast.error(TOAST_MESSAGES.COPY_ERROR);
                                  }
                                }}
                                label="Copy"
                                tooltip="Copy response"
                                disabled={!hasTextToCopy || status === "streaming"}>
                                <Copy className="size-3" />
                              </MessageAction>

                              {/* Regenerate with confirmation */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <MessageAction
                                    label="Regenerate"
                                    tooltip="Regenerate from here"
                                    disabled={!(status === "ready" || status === "error")}>
                                    <RefreshCcw className="size-3" />
                                  </MessageAction>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Regenerate from this message?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will delete all messages after this assistant message,
                                      then regenerate the response for this message. This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        onRegenerateFromMessage(message.id);
                                      }}>
                                      Regenerate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </MessageActions>
                          )}

                          {!isEditing && message.role === "user" && (
                            <MessageActions className="ml-auto">
                              <MessageAction
                                onClick={() => {
                                  onEditMessage(message.id, textParts);
                                }}
                                label="Edit"
                                tooltip="Edit message"
                                disabled={!(status === "ready" || status === "error")}>
                                <Edit2 className="size-3" />
                              </MessageAction>

                              {/* Delete with confirmation */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <MessageAction
                                    label="Delete"
                                    tooltip="Delete message"
                                    disabled={!(status === "ready" || status === "error")}>
                                    <Trash2 className="size-3" />
                                  </MessageAction>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this message?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will delete this user message and all subsequent
                                      messages. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => {
                                        onDeleteMessage(message.id);
                                        toast.success(TOAST_MESSAGES.MESSAGE_DELETED);
                                      }}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </MessageActions>
                          )}
                        </Message>
                      </div>
                    );
                  })}

                  {status === "submitted" && (
                    <Message from="assistant">
                      <MessageContent>
                        <Loader size={16} />
                      </MessageContent>
                    </Message>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="size-4" />
                      <AlertTitle>An error occurred</AlertTitle>
                      <AlertDescription>{error.message || "Please try again."}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </ConversationContent>
          <ConversationScrollButton />
          <ScrollToBottomCapture scrollToBottomRef={scrollToBottomRef} />
        </Conversation>
      </div>
    );
  }
);
ChatMessages.displayName = "ChatMessages";
