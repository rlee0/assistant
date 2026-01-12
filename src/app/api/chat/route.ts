import { APIError, handleAPIError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { buildTools, defaultToolSettings } from "@/tools";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";
import { DEFAULT_MODEL } from "@/lib/constants";
import { createOpenAI } from "@ai-sdk/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { streamText, convertToModelMessages, type UIMessage } from "ai";

/**
 * Request body structure for chat API
 */
interface ChatRequest {
  messages: UIMessage[];
  model?: string;
  context?: string;
}

/**
 * Validates the chat request body structure
 * @throws {APIError} If validation fails
 */
function validateChatRequest(body: unknown): ChatRequest {
  if (!validateObject(body)) {
    throw new APIError("Request body must be a valid JSON object", 400);
  }

  const { messages, model, context } = body as Record<string, unknown>;

  if (!validateArray(messages)) {
    throw new APIError("Messages must be an array", 400);
  }

  if (messages.length === 0) {
    throw new APIError("Messages array cannot be empty", 400);
  }

  if (model !== undefined && !validateString(model, true)) {
    throw new APIError("Model must be a non-empty string", 400);
  }

  if (context !== undefined && !validateString(context, true)) {
    throw new APIError("Context must be a non-empty string", 400);
  }

  return { messages: messages as UIMessage[], model, context };
}

/**
 * Retrieves API configuration from environment variables
 * @throws {APIError} If required configuration is missing
 */
function getAPIConfiguration() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new APIError(
      "AI provider API key is not configured. Please set AI_GATEWAY_API_KEY, OPENAI_API_KEY, or AZURE_OPENAI_API_KEY.",
      500
    );
  }

  const model = process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;

  return {
    apiKey,
    baseURL: process.env.AI_GATEWAY_URL,
    defaultModel: model,
  };
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/chat - Stream AI chat responses
 *
 * @param req - Next.js request object containing UIMessage array
 * @returns Streaming response with UI-optimized message chunks
 */
export async function POST(req: Request) {
  try {
    // Parse and validate request body
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    const { messages, model: requestModel, context } = validateChatRequest(bodyResult);

    // Get API configuration
    const config = getAPIConfiguration();
    const resolvedModel = requestModel || config.defaultModel;

    // Initialize AI provider client
    const client = createOpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    // Fetch user-specific tool settings from Supabase
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let toolSettings = defaultToolSettings();
    if (user?.id) {
      const { data: toolsData, error: toolsError } = await supabase
        .from("tools")
        .select("id,settings")
        .eq("user_id", user.id);

      if (toolsError) {
        console.error("Error fetching tool settings:", toolsError);
      } else if (Array.isArray(toolsData) && toolsData.length > 0) {
        toolSettings = Object.fromEntries(
          toolsData.map((row) => [row.id as string, row.settings ?? {}])
        );
      }
    }

    const tools = buildTools(toolSettings);

    // Convert UIMessages to ModelMessages for the AI provider
    const modelMessages = await convertToModelMessages(messages);

    // Prepend system context if provided
    const augmentedMessages = context
      ? [{ role: "system" as const, content: `Context: ${context}` }, ...modelMessages]
      : modelMessages;

    // Stream the AI response
    const result = streamText({
      model: client(resolvedModel),
      messages: augmentedMessages,
      tools,
    });

    // Return UI-optimized message stream for ai-sdk-ui
    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Log error with context for debugging
    console.error("Chat API Error:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return handleAPIError(error);
  }
}
