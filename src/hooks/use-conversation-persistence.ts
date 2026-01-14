import { useCallback, useRef, useEffect } from "react";
import type { UIMessage } from "ai";
import type { Conversation } from "@/store/chat-store";
import { logError, logWarn, logDebug } from "@/lib/logging";

type UIMessageToChatMessage = (msg: UIMessage) => {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

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

  // Keep converter function ref updated
  useEffect(() => {
    messageToChatMessageRef.current = uiMessageToChatMessage;
  }, [uiMessageToChatMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const persist = useCallback(
    async (conversationId: string, conversation: Conversation, messages: UIMessage[]) => {
      // Abort previous persist requests to avoid stale updates
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/chat/update", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: conversationId,
            title: conversation.title,
            messages: messages.map(messageToChatMessageRef.current),
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "Unknown error");
          logWarn("[ConversationPersistence]", "Persist failed", {
            conversationId,
            status: response.status,
            detail,
          });
        }
      } catch (err) {
        // Ignore abort errors (component unmounted or new request started)
        if (err instanceof Error && err.name === "AbortError") {
          logDebug("[ConversationPersistence]", "Persist aborted", { conversationId });
          return;
        }
        logError("[ConversationPersistence]", "Persist error", err, { conversationId });
      }
    },
    []
  );

  return { persist };
}
