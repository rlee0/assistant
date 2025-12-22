import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
  try {
    const { chatId } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { error: 'Missing chat ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Get recent messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      throw messagesError;
    }

    // Get AI Gateway configuration
    const baseUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (!baseUrl) {
      // Fallback to simple suggestions if no AI Gateway configured
      return NextResponse.json({
        suggestions: [
          'Tell me more',
          'Can you explain that further?',
          'What are the alternatives?',
        ],
      });
    }

    // Create OpenAI-compatible client
    const openai = createOpenAI({
      baseURL: baseUrl,
      apiKey: apiKey || 'dummy-key',
    });

    // Generate suggestions using a cost-efficient model
    const result = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt: `Based on this conversation, suggest 3 brief follow-up questions or prompts (max 10 words each):

${messages?.reverse().map(m => `${m.role}: ${m.content}`).join('\n')}

Return only the 3 suggestions, one per line, without numbers or bullets.`,
    });

    const suggestions = result.text
      .split('\n')
      .filter(s => s.trim())
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Suggestions generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
