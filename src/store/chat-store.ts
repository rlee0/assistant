import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { type ModelMessage } from "ai";

export type ChatMessage = ModelMessage & {
  id: string;
  createdAt: string;
};

export type ChatCheckpoint = ChatMessage[];

export type ChatSession = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  model: string;
  context?: string;
  suggestions: string[];
  messages: ChatMessage[];
  checkpoints: ChatCheckpoint[];
};

type ChatState = {
  chats: Record<string, ChatSession>;
  order: string[];
  selectedId?: string;
  hydrated: boolean;
  hydrate: (data: {
    chats: Record<string, ChatSession>;
    order: string[];
    selectedId?: string;
  }) => void;
  addChat: () => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  togglePin: (id: string) => void;
  updateMessages: (id: string, messages: ChatMessage[]) => void;
  updateTitle: (id: string, title?: string) => void;
  updateContext: (id: string, context: string) => void;
  setModel: (id: string, model: string) => void;
  addCheckpoint: (id: string) => void;
  restoreCheckpoint: (id: string, index?: number) => void;
  generateTitle: (messages: ChatMessage[]) => string;
  generateSuggestions: (messages: ChatMessage[], context?: string) => string[];
};

import {
  DEFAULT_MODEL,
  DEFAULT_CHAT_CONTEXT,
  DEFAULT_SUGGESTIONS,
  DEFAULT_CHAT_TITLE,
  INITIAL_SUGGESTIONS,
  CONTEXT_SUGGESTIONS_BASE,
  NO_CONTEXT_SUGGESTIONS,
  SUGGESTION_TRIGGERS,
} from "@/lib/constants";

const initialChat: ChatSession = {
  id: uuid(),
  title: DEFAULT_CHAT_TITLE,
  pinned: false,
  updatedAt: new Date().toISOString(),
  model: DEFAULT_MODEL,
  context: DEFAULT_CHAT_CONTEXT,
  suggestions: [...DEFAULT_SUGGESTIONS],
  messages: [],
  checkpoints: [],
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: { [initialChat.id]: initialChat },
      order: [initialChat.id],
      selectedId: initialChat.id,
      hydrated: false,
      hydrate: (data) =>
        set(() => ({
          chats: data.chats,
          order: data.order,
          selectedId: data.selectedId ?? data.order[0],
          hydrated: true,
        })),
      addChat: () => {
        const id = uuid();
        const now = new Date().toISOString();
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              id,
              title: DEFAULT_CHAT_TITLE,
              pinned: false,
              updatedAt: now,
              model: DEFAULT_MODEL,
              context: state.chats[state.selectedId ?? initialChat.id]?.context,
              suggestions: [...INITIAL_SUGGESTIONS],
              messages: [],
              checkpoints: [],
            },
          },
          order: [id, ...state.order],
          selectedId: id,
        }));
        return id;
      },
      selectChat: (id) => set(() => ({ selectedId: id })),
      deleteChat: (id) =>
        set((state) => {
          const rest = { ...state.chats };
          delete rest[id];
          const order = state.order.filter((cid) => cid !== id);
          return {
            chats: rest,
            order,
            selectedId: order[0],
          };
        }),
      togglePin: (id) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              pinned: !state.chats[id].pinned,
            },
          },
        })),
      updateMessages: (id, messages) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              messages,
              updatedAt: new Date().toISOString(),
              suggestions: state.generateSuggestions(messages, state.chats[id]?.context),
              title:
                state.chats[id]?.title === DEFAULT_CHAT_TITLE
                  ? state.generateTitle(messages)
                  : state.chats[id]?.title,
            },
          },
        })),
      updateTitle: (id, title) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              title: title ?? state.generateTitle(state.chats[id].messages),
            },
          },
        })),
      updateContext: (id, context) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              context,
            },
          },
        })),
      setModel: (id, model) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              model,
            },
          },
        })),
      addCheckpoint: (id) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [id]: {
              ...state.chats[id],
              checkpoints: [...state.chats[id].checkpoints, state.chats[id].messages],
            },
          },
        })),
      restoreCheckpoint: (id, index) =>
        set((state) => {
          const checkpoints = state.chats[id]?.checkpoints ?? [];
          const checkpoint = checkpoints[index ?? checkpoints.length - 1] ?? checkpoints.at(-1);
          if (!checkpoint) return state;
          return {
            chats: {
              ...state.chats,
              [id]: {
                ...state.chats[id],
                messages: checkpoint,
              },
            },
          };
        }),
      generateTitle: (messages) => {
        const firstUser = messages.find((m) => m.role === "user");
        if (!firstUser || typeof firstUser.content !== "string") {
          return DEFAULT_CHAT_TITLE;
        }
        const text = firstUser.content;
        return text.slice(0, 42).trim() + (text.length > 42 ? "…" : "");
      },
      generateSuggestions: (messages, context) => {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const base: string[] = context
          ? [...CONTEXT_SUGGESTIONS_BASE]
          : [...NO_CONTEXT_SUGGESTIONS];
        if (!lastUser || typeof lastUser.content !== "string") return base;
        const text = lastUser.content.toLowerCase();
        const suggestions = [...base];
        if (text.includes("test")) {
          suggestions.push(SUGGESTION_TRIGGERS.TEST);
        }
        if (text.includes("code")) {
          suggestions.push(SUGGESTION_TRIGGERS.CODE);
        }
        if (text.includes("plan")) {
          suggestions.push(SUGGESTION_TRIGGERS.PLAN);
        }
        return Array.from(new Set(suggestions)).slice(0, 5);
      },
    }),
    {
      name: "chat-sessions",
    }
  )
);
