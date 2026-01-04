import { buildTools, defaultToolSettings } from "@/tools";

import type { CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { streamText } from "ai";

interface ChatRequest {
  messages: CoreMessage[];
  model?: string;
  context?: string;
}

function validateChatRequest(body: unknown): ChatRequest | { error: string } {
  if (typeof body !== "object" || body === null) {
    return { error: "Request body must be a JSON object" };
  }

  const { messages, model, context } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: "Messages array is required and must not be empty" };
  }

  if (model !== undefined && typeof model !== "string") {
    return { error: "Model must be a string" };
  }

  if (context !== undefined && typeof context !== "string") {
    return { error: "Context must be a string" };
  }

  return { messages, model, context };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = validateChatRequest(body);

    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { messages, model: requestModel, context } = validation;

    const apiKey =
      process.env.AI_GATEWAY_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.AZURE_OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing API key for model provider" }, { status: 500 });
    }

    const resolvedModel =
      requestModel || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || "gpt-4o-mini";

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
    const query = userId
      ? supabase.from("tools").select("id,settings").eq("user_id", userId)
      : supabase.from("tools").select("id,settings");

    const { data: toolsData } = await query;
    if (Array.isArray(toolsData) && toolsData.length > 0) {
      toolSettings = Object.fromEntries(
        toolsData.map((row: Record<string, unknown>) => [row.id, row.settings ?? {}])
      );
    }
    const tools = buildTools(toolSettings);

    const augmentedMessages: CoreMessage[] = context
      ? [{ role: "system" as const, content: `Context: ${context}` }, ...messages]
      : messages;

    const result = await streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
    });
    return result.toTextStreamResponse();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process chat request";
    console.error("Chat request error:", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
