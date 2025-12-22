import { NextResponse } from "next/server";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import type { CoreMessage } from "ai";

export async function POST(req: Request) {
  const { messages, model, context }: { messages: CoreMessage[]; model?: string; context?: string } =
    await req.json();

  const resolvedModel =
    model || process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || "gpt-4o-mini";

  const client = openai({
    apiKey:
      process.env.AI_GATEWAY_API_KEY ??
      process.env.OPENAI_API_KEY ??
      process.env.AZURE_OPENAI_API_KEY ??
      "",
    baseURL: process.env.AI_GATEWAY_URL,
  });

  if (!client) {
    return NextResponse.json(
      { error: "Model provider unavailable" },
      { status: 500 }
    );
  }

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
