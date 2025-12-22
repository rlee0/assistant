'use client';

import { useState } from 'react';
import { useChatStore } from '@/store/chat-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendIcon, StopCircleIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useModels } from '@/lib/ai/use-models';

export function PromptArea() {
  const { activeChat, addMessage, messages: storeMessages, updateChat } = useChatStore();
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [isStreaming, setIsStreaming] = useState(false);
  const { models } = useModels();

  const handleSend = async () => {
    if (!input.trim() || !activeChat || isStreaming) return;

    setIsStreaming(true);
    const userMessage = input.trim();
    setInput('');

    try {
      const supabase = createClient();
      
      // Save user message
      const { data: userMsg, error: userError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat.id,
          role: 'user',
          content: userMessage,
        }])
        .select()
        .single();

      if (userError) throw userError;
      addMessage(userMsg);

      // Auto-generate title if this is the first message
      if (storeMessages.length === 0 && activeChat.title === 'New Chat') {
        try {
          const titleResponse = await fetch('/api/ai/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: activeChat.id,
              firstMessage: userMessage,
            }),
          });

          if (titleResponse.ok) {
            const { title } = await titleResponse.json();
            updateChat(activeChat.id, { title });
          }
        } catch (err) {
          console.error('Failed to generate title:', err);
        }
      }

      // Prepare messages for AI
      const allMessages = [
        ...storeMessages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];

      // Call AI endpoint with streaming
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: activeChat.id,
          messages: allMessages,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;
        }
      }

      // Save AI response to database
      const { data: aiMsg, error: aiError } = await supabase
        .from('messages')
        .insert([{
          chat_id: activeChat.id,
          role: 'assistant',
          content: assistantMessage || 'Sorry, I could not generate a response.',
        }])
        .select()
        .single();

      if (aiError) throw aiError;
      addMessage(aiMsg);

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto max-w-4xl space-y-4">
        {/* Model selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isStreaming}
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        {/* Input area */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 resize-none"
            rows={3}
            disabled={isStreaming}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            size="icon"
            className="h-auto"
          >
            {isStreaming ? (
              <StopCircleIcon className="h-4 w-4" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </div>

        {activeChat && (
          <div className="text-xs text-muted-foreground">
            Chatting in: {activeChat.title}
            {isStreaming && <span className="ml-2 animate-pulse">● Generating...</span>}
          </div>
        )}
      </div>
    </div>
  );
}
