import { logError, logDebug, logWarn } from "@/lib/logging";
import { API_ROUTES } from "@/lib/api/routes";
import { chatSessionToConversation, type Conversation } from "@/features/chat/store/chat-store";
import type { ChatSession, ChatMessage } from "@/features/chat/types";
import {
  AuthenticationError,
  isAbortedError,
  createErrorFromStatus,
  getErrorMessage,
} from "../errors";

/**
 * Parameters for persisting a conversation
 */
export interface PersistConversationParams {
  conversationId: string;
  title: string;
  messages: ChatMessage[];
  checkpoints: Conversation["checkpoints"];
}

/**
 * Persists a conversation to the backend
 * Non-throwing handler that logs errors gracefully
 *
 * @param params - Persistence parameters
 * @param signal - AbortSignal for cleanup
 *
 * @example
 * ```ts
 * await persistConversation({
 *   conversationId: "123",
 *   title: "My Chat",
 *   messages: [...],
 *   checkpoints: [...]
 * }, signal);
 * ```
 */
export async function persistConversation(
  params: PersistConversationParams,
  signal: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(API_ROUTES.CHAT.UPDATE, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: params.conversationId,
        title: params.title,
        messages: params.messages,
        checkpoints: params.checkpoints,
      }),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown error");
      const error = createErrorFromStatus(response.status, "Persist failed", detail);

      if (error instanceof AuthenticationError) {
        logError("[Chat]", "Authentication required", error);
        return;
      }

      logWarn("[Chat]", "Persist conversation failed", {
        conversationId: params.conversationId,
        status: response.status,
        message: error.message,
      });
      return;
    }
  } catch (err) {
    if (isAbortedError(err)) return;
    logError("[Chat]", "Persist conversation error", err, {
      conversationId: params.conversationId,
    });
  }
}

/**
 * Parameters for creating a conversation
 */
export interface CreateConversationParams {
  model: string;
}

/**
 * Creates a new conversation on the backend
 * Throws on failure for proper error handling in the component
 *
 * @param params - Creation parameters
 * @param signal - AbortSignal for cleanup
 * @returns The ID of the created conversation
 * @throws Structured error on failure
 *
 * @example
 * ```ts
 * const conversationId = await createConversationRequest(
 *   { model: "gpt-4" },
 *   signal
 * );
 * ```
 */
export async function createConversationRequest(
  params: CreateConversationParams,
  signal: AbortSignal
): Promise<string> {
  try {
    const response = await fetch(API_ROUTES.CHAT.CREATE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown error");
      throw createErrorFromStatus(response.status, "Create failed", detail);
    }

    const data = (await response.json()) as { chat: ChatSession };
    return chatSessionToConversation(data.chat).id;
  } catch (error) {
    if (isAbortedError(error)) {
      logDebug("[Chat]", "Create conversation aborted");
      throw error;
    }

    logError("[Chat]", "Failed to create conversation", error);
    throw error;
  }
}

/**
 * Parameters for deleting a conversation
 */
export interface DeleteConversationParams {
  id: string;
}

/**
 * Deletes a conversation on the backend
 * Non-throwing handler that logs errors gracefully
 *
 * @param params - Deletion parameters
 * @param signal - AbortSignal for cleanup
 *
 * @example
 * ```ts
 * await deleteConversationRequest({ id: "123" }, signal);
 * ```
 */
export async function deleteConversationRequest(
  params: DeleteConversationParams,
  signal: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(API_ROUTES.CHAT.DELETE, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "Unknown error");
      const error = createErrorFromStatus(response.status, "Delete failed", detail);
      logError("[Chat]", getErrorMessage(error), error, {
        conversationId: params.id,
      });
      return;
    }
  } catch (err) {
    if (isAbortedError(err)) {
      logDebug("[Chat]", "Delete conversation aborted", { conversationId: params.id });
      return;
    }
    logError("[Chat]", "Delete conversation error", err, {
      conversationId: params.id,
    });
  }
}
