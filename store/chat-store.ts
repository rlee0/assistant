import { create } from 'zustand';
import { Chat, Message } from '@/types/database';

interface ChatState {
  chats: Chat[];
  activeChat: Chat | null;
  messages: Message[];
  isLoading: boolean;
  isSidebarCollapsed: boolean;
  
  // Actions
  setChats: (chats: Chat[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  deleteMessage: (id: string) => void;
  createChat: (chat: Chat) => void;
  updateChat: (id: string, updates: Partial<Chat>) => void;
  deleteChat: (id: string) => void;
  pinChat: (id: string) => void;
  unpinChat: (id: string) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChat: null,
  messages: [],
  isLoading: false,
  isSidebarCollapsed: false,
  
  setChats: (chats) => set({ chats }),
  
  setActiveChat: (chat) => set({ activeChat: chat }),
  
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
  })),
  
  updateMessage: (id, content) => set((state) => ({
    messages: state.messages.map((msg) =>
      msg.id === id ? { ...msg, content } : msg
    ),
  })),
  
  deleteMessage: (id) => set((state) => ({
    messages: state.messages.filter((msg) => msg.id !== id),
  })),
  
  createChat: (chat) => set((state) => ({
    chats: [chat, ...state.chats],
  })),
  
  updateChat: (id, updates) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === id ? { ...chat, ...updates } : chat
    ),
    activeChat: state.activeChat?.id === id
      ? { ...state.activeChat, ...updates }
      : state.activeChat,
  })),
  
  deleteChat: (id) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === id ? { ...chat, is_deleted: true } : chat
    ),
    activeChat: state.activeChat?.id === id ? null : state.activeChat,
  })),
  
  pinChat: (id) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === id ? { ...chat, is_pinned: true } : chat
    ),
  })),
  
  unpinChat: (id) => set((state) => ({
    chats: state.chats.map((chat) =>
      chat.id === id ? { ...chat, is_pinned: false } : chat
    ),
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  toggleSidebar: () => set((state) => ({
    isSidebarCollapsed: !state.isSidebarCollapsed,
  })),
  
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
}));
