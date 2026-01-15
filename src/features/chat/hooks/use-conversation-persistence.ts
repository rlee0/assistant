import { logDebug, logError, logWarn } from "@/lib/logging";
import { useCallback, useEffect, useRef } from "react";

import { API_ROUTES } from "@/lib/api/routes";
import type { Conversation } from "@/features/chat/store/chat-store";
import type { UIMessage } from "ai";

type UIMessageToChatMessage = (msg: UIMessage) => {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

/** Timeout for persistence requests (ms) */
const PERSIST_REQUEST_TIMEOUT_MS = 10000;

/**
 * Manages conversation persistence with proper lifecycle cleanup and abort handling.
 *
 * Features:
 * - Aborts previous requests when new persist is called (prevents stale updates)
 * - Automatic cleanup on unmount
 * - Structured error handling with timeout support
 * - Type-safe API communication
 *
 * @throws Does not throw; logs errors instead
 */
export function useConversationPersistence(uiMessageToChatMessage: UIMessageToChatMessage) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageToChatMessageRef = useRef(uiMessageToChatMessage);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep converter function ref updated
  useEffect(() => {
    messageToChatMessageRef.current = uiMessageToChatMessage;
  }, [uiMessageToChatMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  const persist = useCallback(
    async (conversationId: string, conversation: Conversation, messages: UIMessage[]) => {
      // Clean up previous timeout if any
      if (timeoutIdRef.current !== null) {
        clearTimeout(timeoutIdRef.current);
      }

      // Abort previous persist requests to avoid stale updates
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        // Set up timeout to abort the request
        timeoutIdRef.current = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, PERSIST_REQUEST_TIMEOUT_MS);

        const response = await fetch(API_ROUTES.CHAT.UPDATE, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conversationId,
            title: conversation.title,
            messages: messages.map(messageToChatMessageRef.current),
          }),
          signal: abortControllerRef.current.signal,
        });

        // Clear timeout on successful response
        if (timeoutIdRef.current !== null) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        if (!response.ok) {
          const detail = await response.text().catch(() => "Unknown error");
          logWarn("[ConversationPersistence]", "Persist failed", {
            conversationId,
            status: response.status,
            detail,
          });
        }
      } catch (err) {
        // Clear timeout on error
        if (timeoutIdRef.current !== null) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        // Ignore abort errors (component unmounted, new request started, or timeout)
        if (err instanceof Error && err.name === "AbortError") {
          logDebug("[ConversationPersistence]", "Persist aborted or timed out", { conversationId });
          return;
        }
        logError("[ConversationPersistence]", "Persist error", err, { conversationId });
      }
    },
    []
  );

  return { persist };
}
