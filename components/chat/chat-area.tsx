'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { createClient } from '@/lib/supabase/client';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVerticalIcon, PinIcon, PinOffIcon, Trash2Icon, EditIcon, RefreshCwIcon, MoreHorizontalIcon } from 'lucide-react';

export function ChatArea() {
  const { activeChat, messages, setMessages, pinChat, unpinChat, deleteChat, updateChat, updateMessage, deleteMessage } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');

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

  const handleRename = async () => {
    if (!activeChat || !newTitle.trim()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('chats')
        .update({ title: newTitle.trim() })
        .eq('id', activeChat.id);

      if (error) throw error;
      
      updateChat(activeChat.id, { title: newTitle.trim() });
      setRenameDialogOpen(false);
      setNewTitle('');
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const openRenameDialog = () => {
    if (activeChat) {
      setNewTitle(activeChat.title);
      setRenameDialogOpen(true);
    }
  };

  const startEditMessage = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditedContent(content);
  };

  const saveEditedMessage = async (messageId: string) => {
    if (!editedContent.trim()) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('messages')
        .update({ content: editedContent.trim() })
        .eq('id', messageId);

      if (error) throw error;

      updateMessage(messageId, editedContent.trim());
      setEditingMessageId(null);
      setEditedContent('');
    } catch (error) {
      console.error('Failed to update message:', error);
    }
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditedContent('');
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const handleResendMessage = async (messageContent: string) => {
    // This would trigger a resend by creating a new user message
    // The prompt area would handle sending it to the AI
    if (!activeChat) return;

    try {
      const supabase = createClient();
      const { data: userMsg, error } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat.id,
          role: 'user',
          content: messageContent,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // This will be picked up by the chat and trigger AI response
      loadMessages();
    } catch (error) {
      console.error('Failed to resend message:', error);
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
              <DropdownMenuItem onClick={openRenameDialog}>
                <EditIcon className="mr-2 h-4 w-4" />
                Rename Chat
              </DropdownMenuItem>
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
                <div className="group relative max-w-[80%]">
                  {editingMessageId === message.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEditedMessage(message.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditMessage}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                      <div className="absolute -top-2 right-0 hidden group-hover:block">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontalIcon className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {message.role === 'user' && (
                              <>
                                <DropdownMenuItem onClick={() => startEditMessage(message.id, message.content)}>
                                  <EditIcon className="mr-2 h-3 w-3" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleResendMessage(message.content)}>
                                  <RefreshCwIcon className="mr-2 h-3 w-3" />
                                  Resend
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteMessage(message.id)}
                              className="text-destructive"
                            >
                              <Trash2Icon className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription>
              Enter a new title for this chat conversation.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat title"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRename();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
