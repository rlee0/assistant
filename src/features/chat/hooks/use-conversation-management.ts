"use client";

import { logDebug, logError } from "@/lib/logging";
import { useCallback, useRef } from "react";

import { CHAT_REQUEST_TIMEOUT_MS } from "@/features/chat/constants";
import type { Conversation } from "../store/chat-store";
import { createConversationRequest } from "../handlers/conversation-handlers";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UseConversationManagementParams {
  readonly currentModel: string;
  readonly selectedId: string | null;
  readonly order: ReadonlyArray<string>;
  readonly conversations: Readonly<Record<string, Conversation>>;
  readonly onUpsertConversation: (conversation: Conversation) => void;
  readonly onSelectConversation: (id: string) => void;
  readonly onSetMessages: (messages: unknown[]) => void;
  readonly onResetUIState: () => void;
}

interface UseConversationManagementReturn {
  creatingChat: boolean;
  findExistingNewChat: () => string | null;
  createConversation: () => Promise<string>;
  ensureConversation: () => Promise<string>;
  deleteConversation: (conversationId: string) => Promise<void>;
}

/**
 * Manages conversation lifecycle operations (create, delete, ensure)
 *
 * Extracted from ChatClient to improve separation of concerns and testability.
 *
 * @param params - Configuration and callbacks
 * @returns Conversation management functions and state
 */
export function useConversationManagement(
  params: UseConversationManagementParams
): UseConversationManagementReturn {
  const router = useRouter();
  const pendingCreateRef = useRef<Promise<string> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    currentModel,
    selectedId,
    order,
    conversations,
    onUpsertConversation,
    onSelectConversation,
    onSetMessages,
    onResetUIState,
  } = params;

  /**
   * Finds an existing "New chat" conversation with no user messages
   * Prioritizes current selection if available
   */
  const findExistingNewChat = useCallback((): string | null => {
    const candidateIds = selectedId
      ? [selectedId, ...order.filter((id) => id !== selectedId)]
      : order;

    for (const id of candidateIds) {
      const conversation = conversations[id];
      if (!conversation) continue;

      const hasDefaultTitle = !conversation.title || conversation.title === "New chat";
      const convMessages = conversation.messages ?? [];
      const hasUserMessages = convMessages.some((message) => message.role === "user");

      if (hasDefaultTitle && !hasUserMessages) {
        return id;
      }
    }

    return null;
  }, [conversations, order, selectedId]);

  /**
   * Creates a new conversation with deduplication (prevents double creation)
   */
  const createConversation = useCallback(async (): Promise<string> => {
    if (pendingCreateRef.current) {
      return pendingCreateRef.current;
    }

    const createPromise = (async (): Promise<string> => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        CHAT_REQUEST_TIMEOUT_MS
      );

      try {
        const conversationId = await createConversationRequest(
          { model: currentModel },
          abortControllerRef.current.signal
        );

        onUpsertConversation({
          id: conversationId,
          title: "New chat",
          messages: [],
          checkpoints: [],
          pinned: false,
          updatedAt: new Date().toISOString(),
          lastUserMessageAt: new Date().toISOString(),
          model: currentModel,
          suggestions: [],
        });

        onSelectConversation(conversationId);
        router.push(`/chat/${conversationId}`);
        onSetMessages([]);
        onResetUIState();

        return conversationId;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          logDebug("[Chat]", "Create conversation aborted");
          throw error;
        }

        logError("[Chat]", "Failed to create conversation", error);
        toast.error("Failed to create conversation. Please try again.");
        throw error;
      } finally {
        clearTimeout(timeoutId);
        pendingCreateRef.current = null;
      }
    })();

    pendingCreateRef.current = createPromise;
    return createPromise;
  }, [
    currentModel,
    onUpsertConversation,
    onSelectConversation,
    onSetMessages,
    onResetUIState,
    router,
  ]);

  /**
   * Ensures a conversation exists, creating one if needed
   */
  const ensureConversation = useCallback(async (): Promise<string> => {
    if (selectedId && conversations[selectedId]) return selectedId;

    const existingNewChat = findExistingNewChat();
    if (existingNewChat) {
      onSelectConversation(existingNewChat);
      return existingNewChat;
    }

    return createConversation();
  }, [selectedId, conversations, findExistingNewChat, onSelectConversation, createConversation]);

  /**
   * Deletes a conversation
   */
  const deleteConversation = useCallback(async (): Promise<void> => {
    // Deletion is handled by the store
    // This is a placeholder for potential future cleanup
  }, []);

  return {
    creatingChat: pendingCreateRef.current !== null,
    findExistingNewChat,
    createConversation,
    ensureConversation,
    deleteConversation,
  };
}
