import { create } from "zustand";
import { type UIMessage } from "ai";
import { type InitialChatData } from "@/lib/supabase/loaders";
import { type ChatCheckpoint, type ChatMessage, type ChatSession } from "@/types/chat";

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
  hydrate: (data: InitialChatData) => void;
  select: (id: string | null) => void;
  upsert: (conversation: Conversation) => void;
  updateMessages: (id: string, messages: UIMessage[]) => void;
  updateTitle: (id: string, title: string) => void;
  setStatus: (id: string, status: ConversationStatus) => void;
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

export const useChatStore = create<ChatState>((set) => ({
  conversations: {},
  order: [],
  selectedId: null,
  status: {},
  hydrated: false,

  hydrate: (data) => {
    if (!data || typeof data !== "object") {
      console.error("[ChatStore] Invalid hydration data", { data });
      return;
    }

    try {
      const conversations: Record<string, Conversation> = {};
      const statuses: Record<string, ConversationStatus> = {};

      if (data.chats && typeof data.chats === "object") {
        Object.values(data.chats).forEach((session) => {
          if (session && typeof session === "object" && "id" in session) {
            const sess = session as ChatSession;
            conversations[sess.id] = chatSessionToConversation(sess);
            statuses[sess.id] = "idle";
          }
        });
      }

      const order = sortOrderByLastUserMessage(
        (Array.isArray(data.order) ? data.order : Object.keys(conversations)).filter(
          (id): id is string => typeof id === "string" && id in conversations
        ),
        conversations
      );
      const selectedId =
        typeof data.selectedId === "string" && data.selectedId in conversations
          ? data.selectedId
          : order[0] ?? null;

      set({
        conversations,
        order,
        selectedId,
        status: statuses,
        hydrated: true,
      });
    } catch (error) {
      console.error("[ChatStore] Hydration failed", { error });
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
      const isUserMessage = lastMessage?.role === "user";

      const updatedConversation: Conversation = {
        ...conversation,
        messages,
        updatedAt: now,
        lastUserMessageAt: isUserMessage ? now : conversation.lastUserMessageAt,
      };

      const conversations = { ...state.conversations, [id]: updatedConversation };

      return {
        conversations,
        order: sortOrderByLastUserMessage(state.order, conversations),
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
        order: sortOrderByLastUserMessage(state.order, conversations),
      };
    }),

  setStatus: (id, status) => set((state) => ({ status: { ...state.status, [id]: status } })),

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

  reset: () => set({ conversations: {}, order: [], selectedId: null, status: {}, hydrated: false }),
}));
