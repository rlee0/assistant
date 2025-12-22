import { NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { buildTools, defaultToolSettings } from "@/tools";

export async function POST(req: Request) {
  const {
    messages,
    model,
    context,
  }: { messages: CoreMessage[]; model?: string; context?: string } = await req.json();

  const apiKey =
    process.env.AI_GATEWAY_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.AZURE_OPENAI_API_KEY ??
    "";

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key for model provider" },
      { status: 500 }
    );
  }

  const resolvedModel =
    model || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || "gpt-4o-mini";

  const client = openai({
    apiKey,
    baseURL: process.env.AI_GATEWAY_URL,
  });

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  let toolSettings = defaultToolSettings();
  if (userId) {
    const { data } = await supabase
      .from("tools")
      .select("id,settings")
      .eq("user_id", userId);
    if (data) {
      toolSettings = Object.fromEntries(
        data.map((row) => [row.id, row.settings ?? {}])
      );
    }
  }
  const tools = buildTools(toolSettings);

  const augmentedMessages = context
    ? [
        { role: "system", content: `Context: ${context}` as const },
        ...messages,
      ]
    : messages;

  try {
    const result = await streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
      maxSteps: 6,
    });
    return result.toAIStreamResponse();
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to stream from AI gateway" },
      { status: 500 }
    );
  }
}
