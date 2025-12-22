'use client';

import { useEffect } from 'react';
import { useChatStore } from '@/store/chat-store';
import { ChatSidebar } from '@/components/chat/sidebar';
import { ChatArea } from '@/components/chat/chat-area';
import { PromptArea } from '@/components/chat/prompt-area';

export default function ChatPage() {
  const { activeChat, isSidebarCollapsed } = useChatStore();

  return (
    <div className="flex h-screen overflow-hidden">
      <ChatSidebar />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeChat ? (
          <>
            <ChatArea />
            <PromptArea />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h2 className="text-2xl font-semibold">Welcome to AI Assistant</h2>
              <p className="mt-2">Select a chat or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
