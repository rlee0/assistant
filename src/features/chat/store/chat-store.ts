import { create } from "zustand";
import { logWarn, logError } from "@/lib/logging";
import { type UIMessage } from "ai";
import {
  type InitialChatData,
  type ChatCheckpoint,
  type ChatMessage,
  type ChatSession,
  type Conversation,
  isValidMessageParts,
  isValidMessageRole,
} from "@/features/chat/types";
import { MAX_CHECKPOINTS } from "@/features/chat/constants";
import { nanoid } from "nanoid";

export type ConversationStatus = "idle" | "loading" | "streaming" | "error";

type ChatState = {
  conversations: Record<string, Conversation>;
  order: string[];
  selectedId: string | null;
  status: Record<string, ConversationStatus>;
  hydrated: boolean;
  currentUserId: string | null; // Track current user to detect user switches
  hydrate: (data: InitialChatData) => void;
  select: (id: string | null) => void;
  upsert: (conversation: Conversation) => void;
  updateMessages: (id: string, messages: UIMessage[]) => void;
  updateTitle: (id: string, title: string) => void;
  setStatus: (id: string, status: ConversationStatus) => void;
  setSuggestions: (id: string, suggestions: string[]) => void;
  clearSuggestions: (id: string) => void;
  addCheckpoint: (id: string, messageIndex: number) => void;
  restoreCheckpoint: (id: string, checkpointId: string) => void;
  removeCheckpoint: (id: string, checkpointId: string) => void;
  remove: (id: string) => void;
  reset: () => void;
};

function getUpdatedMs(conversation: Conversation | undefined): number {
  if (!conversation) return 0;
  const timestamp = Date.parse(conversation.updatedAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortOrderByUpdatedAt(
  order: string[],
  conversations: Record<string, Conversation>
): string[] {
  const originalIndex = new Map(order.map((id, index) => [id, index]));
  const normalized = normalizeOrder(order).filter((id) => id in conversations);
  const updatedMsCache = new Map<string, number>();
  for (const id of normalized) {
    updatedMsCache.set(id, getUpdatedMs(conversations[id]));
  }

  return normalized.sort((a, b) => {
    const diff = (updatedMsCache.get(b) ?? 0) - (updatedMsCache.get(a) ?? 0);
    if (diff !== 0) return diff;
    return (originalIndex.get(a) ?? 0) - (originalIndex.get(b) ?? 0);
  });
}

function areMessagesEqual(a: UIMessage[] | undefined, b: UIMessage[]): boolean {
  if (!a || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];

    if (left.id !== right.id || left.role !== right.role) return false;

    const leftParts = JSON.stringify(left.parts ?? []);
    const rightParts = JSON.stringify(right.parts ?? []);
    if (leftParts !== rightParts) return false;
  }
  return true;
}

/**
 * Deduplicate and normalize conversation order, preserving first occurrence.
 */
function normalizeOrder(order: string[]): string[] {
  const seen = new Set<string>();
  return order.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Convert server ChatMessage to client UIMessage
 *
 * Handles multiple content formats:
 * 1. JSON-serialized message parts (primary)
 * 2. Plain text (fallback)
 * 3. Already-parsed parts array (edge case)
 *
 * Always validates before type conversion.
 */
export function chatMessageToUIMessage(message: ChatMessage): UIMessage {
  let parts: UIMessage["parts"] = [];

  if (typeof message.content === "string") {
    try {
      // Attempt to parse as JSON
      const parsed: unknown = JSON.parse(message.content);

      // Validate it's a valid parts array before using it
      if (isValidMessageParts(parsed)) {
        // Type-safe assignment after validation
        parts = parsed as UIMessage["parts"];
      } else {
        // Parsed JSON but not valid parts - treat as plain text
        parts = [{ type: "text", text: message.content }] as const;
      }
    } catch {
      // JSON parse failed - treat content as plain text
      parts = [{ type: "text", text: message.content }] as const;
    }
  } else if (Array.isArray(message.content)) {
    // Handle edge case where content is already an array
    // Validate before using
    if (isValidMessageParts(message.content)) {
      // Type-safe assignment after validation
      parts = message.content as UIMessage["parts"];
    } else {
      // Invalid parts array - convert to string
      const text = JSON.stringify(message.content);
      parts = [{ type: "text", text }] as const;
    }
  } else {
    // Handle other types (shouldn't happen in practice)
    const text = JSON.stringify(message.content ?? "");
    parts = [{ type: "text", text }] as const;
  }

  // Validate role before assignment - default to "system" if invalid
  const validRole = isValidMessageRole(message.role) ? message.role : "system";
  const role: UIMessage["role"] = validRole as UIMessage["role"];

  return {
    id: message.id,
    role,
    parts,
  };
}

/**
 * Get the timestamp of the last user message in a conversation
 */
function getLastUserMessageTimestamp(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      return messages[i].createdAt ?? new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Convert server ChatSession to client Conversation
 */
export function chatSessionToConversation(session: ChatSession): Conversation {
  const messages = session.messages.map(chatMessageToUIMessage);
  const lastUserMessageAt = getLastUserMessageTimestamp(session.messages);

  return {
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    updatedAt: session.updatedAt ?? new Date().toISOString(),
    lastUserMessageAt,
    model: session.model,
    context: session.context,
    suggestions: session.suggestions ?? [],
    messages,
    checkpoints: session.checkpoints ?? [],
  };
}

/**
 * Type guard for ChatSession objects
 */
function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === "string" &&
    typeof obj.title === "string" &&
    typeof obj.pinned === "boolean" &&
    Array.isArray(obj.messages)
  );
}

/**
 * Type guard for order array
 */
function isOrderArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((id) => typeof id === "string");
}

/**
 * Validate and type-check initial data structure
 */
function validateInitialData(data: unknown): InitialChatData | null {
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;

  // Validate chats object exists
  if (!obj.chats || typeof obj.chats !== "object") return null;

  const chatsRecord = obj.chats as Record<string, unknown>;
  const chats: Record<string, ChatSession> = {};

  for (const [id, session] of Object.entries(chatsRecord)) {
    if (!isChatSession(session)) {
      if (process.env.NODE_ENV === "development") {
        logWarn("[ChatStore]", `Invalid chat session at key "${id}", skipping`, { session });
      }
      continue;
    }
    chats[id] = session;
  }

  // Empty chats is valid (new user or all chats deleted)
  // Validate order array structure
  const order = isOrderArray(obj.order)
    ? obj.order.filter((id) => id in chats)
    : Object.keys(chats);

  return {
    chats,
    order,
    selectedId:
      typeof obj.selectedId === "string" && obj.selectedId in chats ? obj.selectedId : undefined,
    userId: typeof obj.userId === "string" ? obj.userId : undefined,
  };
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: {},
  order: [],
  selectedId: null,
  status: {},
  hydrated: false,
  currentUserId: null,

  hydrate: (data) => {
    const validated = validateInitialData(data);
    if (!validated) {
      if (process.env.NODE_ENV === "development") {
        logError("[ChatStore]", "Hydration data validation failed", "Invalid hydration", { data });
      }
      set({ hydrated: true });
      return;
    }

    const newUserId = validated.userId || (data as { userId?: string }).userId;
    if (!newUserId) {
      if (process.env.NODE_ENV === "development") {
        logWarn("[ChatStore]", "No userId in hydration data, clearing store");
      }
      set({ conversations: {}, order: [], selectedId: null, currentUserId: null, hydrated: true });
      return;
    }

    try {
      const conversations: Record<string, Conversation> = {};
      const statuses: Record<string, ConversationStatus> = {};

      // validated.chats is already type-checked, safe to use
      for (const [id, session] of Object.entries(validated.chats)) {
        conversations[id] = chatSessionToConversation(session as ChatSession);
        statuses[id] = "idle";
      }

      const order = sortOrderByUpdatedAt(validated.order, conversations);
      // Only use validated.selectedId if explicitly provided, don't auto-select
      const selectedId = validated.selectedId ?? null;

      set((state) => {
        if (state.currentUserId && state.currentUserId !== newUserId) {
          if (process.env.NODE_ENV === "development") {
            logWarn("[ChatStore]", "User changed, replacing data", {
              oldUser: state.currentUserId,
              newUser: newUserId,
            });
          }
        }

        return {
          conversations,
          order,
          selectedId,
          status: statuses,
          currentUserId: newUserId,
          hydrated: true,
        };
      });
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        logError("[ChatStore]", "Hydration processing failed", error);
      }
      set({ hydrated: true });
    }
  },

  select: (id) => set({ selectedId: id ?? null }),

  upsert: (conversation) =>
    set((state) => {
      const previous = state.conversations[conversation.id];
      const now = new Date().toISOString();
      const updatedConversation: Conversation = {
        ...previous,
        ...conversation,
        updatedAt: conversation.updatedAt ?? previous?.updatedAt ?? now,
        lastUserMessageAt: conversation.lastUserMessageAt ?? previous?.lastUserMessageAt ?? now,
      };

      const conversations = {
        ...state.conversations,
        [conversation.id]: updatedConversation,
      };

      const order = sortOrderByUpdatedAt([...state.order, conversation.id], conversations);

      return {
        conversations,
        order,
        status: { ...state.status, [conversation.id]: state.status[conversation.id] ?? "idle" },
      };
    }),

  updateMessages: (id, messages) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      // Skip updates when messages are unchanged (e.g., on selection/navigation)
      if (areMessagesEqual(conversation.messages, messages)) {
        return state;
      }

      // Only update messages. updatedAt is managed by explicit actions (upsert, updateTitle, etc.)
      const updatedConversation: Conversation = {
        ...conversation,
        messages,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  updateTitle: (id, title) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        title,
        updatedAt: new Date().toISOString(),
      };

      const conversations = {
        ...state.conversations,
        [id]: updatedConversation,
      };

      return {
        conversations,
        // Resort order since updatedAt changes on title edits
        order: sortOrderByUpdatedAt(state.order, conversations),
      };
    }),

  setStatus: (id, status) => set((state) => ({ status: { ...state.status, [id]: status } })),

  setSuggestions: (id, suggestions) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        suggestions,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  clearSuggestions: (id) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      const updatedConversation: Conversation = {
        ...conversation,
        suggestions: [],
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  addCheckpoint: (id, messageIndex) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      // Validate messageIndex bounds
      if (messageIndex < 0 || messageIndex > conversation.messages.length) {
        return state;
      }

      // Create new checkpoint
      const checkpoint: ChatCheckpoint = {
        id: nanoid(),
        messageIndex,
        timestamp: new Date().toISOString(),
      };

      // Add checkpoint and remove oldest if exceeding limit
      let checkpoints = [...conversation.checkpoints, checkpoint];
      if (checkpoints.length > MAX_CHECKPOINTS) {
        // Sort by timestamp (oldest first) and remove the first one
        checkpoints = checkpoints
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
          .slice(1);
      }

      const updatedConversation: Conversation = {
        ...conversation,
        checkpoints,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  restoreCheckpoint: (id, checkpointId) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      // Find checkpoint
      const checkpoint = conversation.checkpoints.find((cp) => cp.id === checkpointId);
      if (!checkpoint) return state;

      // Validate messageIndex bounds
      if (checkpoint.messageIndex < 0 || checkpoint.messageIndex > conversation.messages.length) {
        return state;
      }

      // Slice messages before checkpoint index (excluding the user message at checkpoint)
      const restoredMessages = conversation.messages.slice(0, checkpoint.messageIndex);

      // Remove checkpoints at or after the restored index
      const restoredCheckpoints = conversation.checkpoints.filter(
        (cp) => cp.messageIndex < checkpoint.messageIndex
      );

      const updatedConversation: Conversation = {
        ...conversation,
        messages: restoredMessages,
        checkpoints: restoredCheckpoints,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  removeCheckpoint: (id, checkpointId) =>
    set((state) => {
      const conversation = state.conversations[id];
      if (!conversation) return state;

      const checkpoints = conversation.checkpoints.filter((cp) => cp.id !== checkpointId);

      const updatedConversation: Conversation = {
        ...conversation,
        checkpoints,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
      };
    }),

  remove: (id) =>
    set((state) => {
      const conversations = { ...state.conversations };
      const status = { ...state.status };
      delete conversations[id];
      delete status[id];

      const order = state.order.filter((entry) => entry !== id);
      const selectedId = state.selectedId === id ? null : state.selectedId;

      return {
        conversations,
        status,
        order,
        selectedId,
      };
    }),

  reset: () =>
    set({
      conversations: {},
      order: [],
      selectedId: null,
      status: {},
      currentUserId: null,
      hydrated: false,
    }),
}));
