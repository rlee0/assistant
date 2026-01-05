import { APIError, handleAPIError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { buildTools, defaultToolSettings } from "@/tools";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";

import { DEFAULT_MODEL } from "@/lib/constants";
import type { ModelMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { streamText } from "ai";

interface ChatRequest {
  messages: ModelMessage[];
  model?: string;
  context?: string;
}

function validateChatRequest(body: unknown): ChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a JSON object", 400);
  }

  const { messages, model, context } = body as Record<string, unknown>;

  if (!validateArray(messages) || messages.length === 0) {
    throw new APIError("Messages array is required and must not be empty", 400);
  }

  if (model !== undefined && !validateString(model, true)) {
    throw new APIError("Model must be a string", 400);
  }

  if (context !== undefined && !validateString(context, true)) {
    throw new APIError("Context must be a string", 400);
  }

  return { messages: messages as ModelMessage[], model, context };
}

export async function POST(req: Request) {
  try {
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    const { messages, model: requestModel, context } = validateChatRequest(bodyResult);

    const apiKey =
      process.env.AI_GATEWAY_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.AZURE_OPENAI_API_KEY;

    if (!apiKey) {
      throw new APIError("Missing API key for model provider", 500);
    }

    const resolvedModel =
      requestModel || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;

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

    const augmentedMessages: ModelMessage[] = context
      ? [{ role: "system" as const, content: `Context: ${context}` }, ...messages]
      : messages;

    const result = await streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
    });
    return result.toTextStreamResponse();
  } catch (error) {
    return handleAPIError(error);
  }
}
