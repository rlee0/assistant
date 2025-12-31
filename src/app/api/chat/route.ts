import { buildTools, defaultToolSettings } from "@/tools";

import type { CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { streamText } from "ai";

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<{
    messages: CoreMessage[];
    model: string;
    context: string;
  }>;
  const messages: CoreMessage[] = Array.isArray(body?.messages) ? body!.messages! : [];
  const model = body?.model;
  const context = body?.context;

  const apiKey =
    process.env.AI_GATEWAY_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.AZURE_OPENAI_API_KEY ??
    "";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key for model provider" }, { status: 500 });
  }

  const resolvedModel =
    model || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || "gpt-4o-mini";

  const client = createOpenAI({
    apiKey,
    baseURL: process.env.AI_GATEWAY_URL,
  });

  const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  let toolSettings = defaultToolSettings();
  if (userId) {
    const { data } = await supabase.from("tools").select("id,settings").eq("user_id", userId);
    if (data) {
      toolSettings = Object.fromEntries(data.map((row) => [row.id, row.settings ?? {}]));
    }
  } else {
    const { data } = await supabase.from("tools").select("id,settings");
    if (data) {
      toolSettings = Object.fromEntries(data.map((row) => [row.id, row.settings ?? {}]));
    }
  }
  const tools = buildTools(toolSettings);

  const augmentedMessages: CoreMessage[] = context
    ? [{ role: "system" as const, content: `Context: ${context}` }, ...messages]
    : messages;

  try {
    const result = await streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
    });
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to stream from AI gateway";
    console.error("AI gateway error", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
