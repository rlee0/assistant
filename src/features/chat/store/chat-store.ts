import { create } from "zustand";
import { type UIMessage } from "ai";
import { type InitialChatData } from "@/lib/supabase/loaders";
import { type ChatCheckpoint, type ChatMessage, type ChatSession } from "@/features/chat/types";
import { MAX_CHECKPOINTS } from "@/features/chat/constants";
import { nanoid } from "nanoid";

export type ConversationStatus = "idle" | "loading" | "streaming" | "error";

export type Conversation = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  lastUserMessageAt: string;
  model: string;
  context?: string;
  suggestions: string[];
  messages: UIMessage[];
  checkpoints: ChatCheckpoint[];
};

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
  addCheckpoint: (id: string, messageIndex: number) => void;
  restoreCheckpoint: (id: string, checkpointId: string) => void;
  removeCheckpoint: (id: string, checkpointId: string) => void;
  remove: (id: string) => void;
  reset: () => void;
};

function getLastUserMessageMs(conversation: Conversation | undefined): number {
  if (!conversation) return 0;
  const timestamp = Date.parse(conversation.lastUserMessageAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortOrderByLastUserMessage(
  order: string[],
  conversations: Record<string, Conversation>
): string[] {
  const originalIndex = new Map(order.map((id, index) => [id, index]));

  return normalizeOrder(order)
    .filter((id) => id in conversations)
    .sort((a, b) => {
      const diff = getLastUserMessageMs(conversations[b]) - getLastUserMessageMs(conversations[a]);
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

export function chatMessageToUIMessage(message: ChatMessage): UIMessage {
  const text =
    typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "");

  return {
    id: message.id,
    role: message.role as UIMessage["role"],
    parts: [{ type: "text", text }],
  };
}

function getLastUserMessageTimestamp(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "user") {
      return messages[i].createdAt ?? new Date().toISOString();
    }
  }
  return new Date().toISOString();
}

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
        console.warn(`[ChatStore] Invalid chat session at key "${id}", skipping`, session);
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
        console.error("[ChatStore] Hydration data validation failed", { data });
      }
      set({ hydrated: true });
      return;
    }

    const newUserId = validated.userId || (data as { userId?: string }).userId;
    if (!newUserId) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[ChatStore] No userId in hydration data, clearing store");
      }
      set({ conversations: {}, order: [], selectedId: null, currentUserId: null, hydrated: true });
      return;
    }

    try {
      const conversations: Record<string, Conversation> = {};
      const statuses: Record<string, ConversationStatus> = {};

      for (const [id, session] of Object.entries(validated.chats)) {
        conversations[id] = chatSessionToConversation(session);
        statuses[id] = "idle";
      }

      const order = sortOrderByLastUserMessage(validated.order, conversations);
      const selectedId = validated.selectedId ?? order[0] ?? null;

      set((state) => {
        if (state.currentUserId && state.currentUserId !== newUserId) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[ChatStore] User changed, replacing data", {
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
        console.error("[ChatStore] Hydration processing failed", { error });
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

      const order = sortOrderByLastUserMessage([...state.order, conversation.id], conversations);

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

      // Skip updates when messages are unchanged to avoid resorting on selection.
      if (areMessagesEqual(conversation.messages, messages)) {
        return state;
      }

      const now = new Date().toISOString();
      const lastMessage = messages[messages.length - 1];
      const isNewUserMessage =
        lastMessage?.role === "user" && messages.length > conversation.messages.length;

      const updatedConversation: Conversation = {
        ...conversation,
        messages,
        updatedAt: now,
        lastUserMessageAt: isNewUserMessage ? now : conversation.lastUserMessageAt,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      // Only resort order when a new user message is added
      const order = isNewUserMessage
        ? sortOrderByLastUserMessage(state.order, conversations)
        : state.order;

      return {
        conversations,
        order,
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
        // Don't resort order when only updating title
        order: state.order,
      };
    }),

  setStatus: (id, status) => set((state) => ({ status: { ...state.status, [id]: status } })),

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
