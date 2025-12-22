import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export async function POST(request: NextRequest) {
  try {
    const { chatId, firstMessage } = await request.json();

    if (!chatId || !firstMessage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    let title: string;

    // Get AI Gateway configuration
    const baseUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (baseUrl && apiKey) {
      try {
        // Use AI to generate a better title
        const openai = createOpenAI({
          baseURL: baseUrl,
          apiKey: apiKey,
        });

        const result = await generateText({
          model: openai('gpt-3.5-turbo'),
          prompt: `Generate a short, descriptive title (max 6 words) for a conversation that starts with: "${firstMessage}"

Return only the title, nothing else.`,
        });

        title = result.text.trim().replace(/^["']|["']$/g, '');
      } catch (error) {
        console.error('AI title generation failed, using fallback:', error);
        // Fallback to simple extraction
        title = firstMessage.substring(0, 50).trim();
      }
    } else {
      // Simple title generation (fallback when no AI Gateway)
      title = firstMessage.substring(0, 50).trim();
      
      // If it contains a question, use that
      const questionMatch = firstMessage.match(/^(.{5,50}\?)/);
      if (questionMatch) {
        title = questionMatch[1];
      } else if (title.length >= 50) {
        title = title + '...';
      }
    }

    // Update the chat title
    const { error: updateError } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId);

    if (updateError) throw updateError;

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Title generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
