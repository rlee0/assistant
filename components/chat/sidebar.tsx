'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { Button } from '@/components/ui/button';
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, PinIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/cn';

export function ChatSidebar() {
  const {
    chats,
    activeChat,
    isSidebarCollapsed,
    setChats,
    setActiveChat,
    createChat,
    toggleSidebar,
  } = useChatStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadChats = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('is_pinned', { ascending: false })
        .order('modified_at', { ascending: false });

      if (error) throw error;
      setChats(data || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const newChat = {
        user_id: user.id,
        title: 'New Chat',
        is_pinned: false,
        is_deleted: false,
      };

      const { data, error } = await supabase
        .from('chats')
        .insert([newChat])
        .select()
        .single();

      if (error) throw error;
      
      createChat(data);
      setActiveChat(data);
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  if (isSidebarCollapsed) {
    return (
      <div className="flex w-12 flex-col border-r bg-muted/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="m-2"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const pinnedChats = chats.filter((chat) => chat.is_pinned);
  const unpinnedChats = chats.filter((chat) => !chat.is_pinned);

  return (
    <div className="flex w-64 flex-col border-r bg-muted/10">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold">Chats</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={handleNewChat}>
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : (
          <>
            {pinnedChats.length > 0 && (
              <div className="border-b">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground">
                  PINNED
                </div>
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat?.id === chat.id}
                    onClick={() => setActiveChat(chat)}
                  />
                ))}
              </div>
            )}
            
            {unpinnedChats.length > 0 && (
              <div>
                {unpinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat?.id === chat.id}
                    onClick={() => setActiveChat(chat)}
                  />
                ))}
              </div>
            )}
            
            {chats.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                No chats yet. Create one to get started.
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t p-4">
        <Button variant="outline" className="w-full" size="sm">
          Settings
        </Button>
      </div>
    </div>
  );
}

function ChatItem({
  chat,
  isActive,
  onClick,
}: {
  chat: any;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full border-b px-4 py-3 text-left hover:bg-accent ${
        isActive ? 'bg-accent' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 truncate">
          <div className="flex items-center gap-2">
            {chat.is_pinned && <PinIcon className="h-3 w-3 text-muted-foreground" />}
            <div className="truncate font-medium">{chat.title}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDate(chat.modified_at)}
          </div>
        </div>
      </div>
    </button>
  );
}
