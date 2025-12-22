import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { toolRegistry } from '@/lib/ai/tool-registry';

export async function POST(request: NextRequest) {
  try {
    const { chatId, messages: chatMessages, model } = await request.json();

    if (!chatId || !chatMessages || !Array.isArray(chatMessages)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify chat belongs to user
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single();

    if (chatError || !chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get AI Gateway configuration
    const baseUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!baseUrl) {
      // Fallback to stub response if no AI Gateway configured
      return new Response(
        JSON.stringify({
          content: `AI Gateway not configured. Set NEXT_PUBLIC_AI_GATEWAY_URL and AI_GATEWAY_API_KEY environment variables to enable AI responses. Your message was: "${chatMessages[chatMessages.length - 1]?.content}"`,
          model: 'stub',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create OpenAI-compatible client pointing to AI Gateway
    const openai = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || 'dummy-key',
    });

    // Convert tools to ai-sdk format
    const enabledTools = toolRegistry.getEnabledTools();
    const tools: Record<string, any> = {};
    
    enabledTools.forEach((tool) => {
      tools[tool.definition.name] = {
        description: tool.definition.description,
        parameters: tool.definition.parameters,
        execute: tool.definition.execute,
      };
    });

    // Stream the response
    const result = await streamText({
      model: openai(model || 'gpt-3.5-turbo'),
      messages: chatMessages,
      tools: Object.keys(tools).length > 0 ? tools : undefined,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('AI chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
