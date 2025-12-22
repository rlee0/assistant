'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chat-store';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVerticalIcon, PinIcon, PinOffIcon, Trash2Icon } from 'lucide-react';

export function ChatArea() {
  const { activeChat, messages, setMessages, pinChat, unpinChat, deleteChat } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChat) {
      loadMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!activeChat) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', activeChat.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePin = async () => {
    if (!activeChat) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chats')
        .update({ is_pinned: !activeChat.is_pinned })
        .eq('id', activeChat.id);

      if (error) throw error;
      
      if (activeChat.is_pinned) {
        unpinChat(activeChat.id);
      } else {
        pinChat(activeChat.id);
      }
    } catch (error) {
      console.error('Failed to pin/unpin chat:', error);
    }
  };

  const handleDelete = async () => {
    if (!activeChat) return;
    
    if (!confirm('Are you sure you want to delete this chat?')) return;
    
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chats')
        .update({ is_deleted: true })
        .eq('id', activeChat.id);

      if (error) throw error;
      
      deleteChat(activeChat.id);
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  if (!activeChat) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Breadcrumb toolbar */}
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold">{activeChat.title}</h1>
            <p className="text-xs text-muted-foreground">
              Modified {new Date(activeChat.modified_at).toLocaleString()}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handlePin}>
                {activeChat.is_pinned ? (
                  <>
                    <PinOffIcon className="mr-2 h-4 w-4" />
                    Unpin Chat
                  </>
                ) : (
                  <>
                    <PinIcon className="mr-2 h-4 w-4" />
                    Pin Chat
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2Icon className="mr-2 h-4 w-4" />
                Delete Chat
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
