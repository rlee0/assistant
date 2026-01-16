"use client";

import { logDebug, logError } from "@/lib/logging";
import { useCallback, useState } from "react";

import { TOAST_MESSAGES } from "@/features/chat/constants";
import { toast } from "sonner";
import { validateEditText } from "../handlers/message-handlers";

interface UseMessageEditingParams {
  readonly onSaveEdit: (messageId: string, newText: string) => Promise<void>;
}

interface UseMessageEditingReturn {
  editingMessageId: string | null;
  editText: string;
  setEditingMessageId: (id: string | null) => void;
  setEditText: (text: string) => void;
  startEdit: (messageId: string, initialText: string) => void;
  cancelEdit: () => void;
  saveEdit: (messageId: string, newText: string) => Promise<void>;
}

/**
 * Manages message editing state and operations
 *
 * Extracted from ChatClient to improve separation of concerns.
 *
 * @param params - Configuration including onSaveEdit callback
 * @returns Message editing state and handlers
 */
export function useMessageEditing(params: UseMessageEditingParams): UseMessageEditingReturn {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { onSaveEdit } = params;

  /**
   * Starts editing a message by setting the initial text
   */
  const startEdit = useCallback((messageId: string, initialText: string): void => {
    setEditingMessageId(messageId);
    setEditText(initialText);
    logDebug("[Chat]", "Started editing message", { messageId });
  }, []);

  /**
   * Cancels the current edit without saving
   */
  const cancelEdit = useCallback((): void => {
    setEditingMessageId(null);
    setEditText("");
    logDebug("[Chat]", "Cancelled message edit");
  }, []);

  /**
   * Saves the edited message after validation
   */
  const saveEdit = useCallback(
    async (messageId: string, newText: string): Promise<void> => {
      // Validate text is not empty
      if (!validateEditText(newText)) {
        return;
      }

      try {
        await onSaveEdit(messageId, newText);
        setEditingMessageId(null);
        setEditText("");
        toast.success(TOAST_MESSAGES.MESSAGE_UPDATED);
        logDebug("[Chat]", "Message edited successfully", { messageId });
      } catch (error) {
        logError("[Chat]", "Failed to save message edit", error, { messageId });
        toast.error("Failed to save changes. Please try again.");
      }
    },
    [onSaveEdit]
  );

  return {
    editingMessageId,
    editText,
    setEditingMessageId,
    setEditText,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
