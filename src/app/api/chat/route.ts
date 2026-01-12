import { APIError, handleAPIError, ErrorCodes } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";
import { DEFAULT_MODEL } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

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
    throw new APIError(
      "Request body must be a valid JSON object",
      400,
      ErrorCodes.VALIDATION_ERROR
    );
  }

  const { messages, model, context } = body as Record<string, unknown>;

  if (!validateArray(messages)) {
    throw new APIError("Messages must be an array", 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (messages.length === 0) {
    throw new APIError("Messages array cannot be empty", 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (model !== undefined && !validateString(model, true)) {
    throw new APIError("Model must be a non-empty string", 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (context !== undefined && !validateString(context, true)) {
    throw new APIError("Context must be a non-empty string", 400, ErrorCodes.VALIDATION_ERROR);
  }

  return { messages: messages as UIMessage[], model, context };
}

/**
 * Retrieves and validates AI Gateway configuration from environment variables
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
      500,
      ErrorCodes.INTERNAL_ERROR
    );
  }

  const baseURL = process.env.AI_GATEWAY_URL;
  if (!baseURL) {
    throw new APIError("AI_GATEWAY_URL is not configured", 500, ErrorCodes.INTERNAL_ERROR);
  }

  const defaultModel = process.env.AI_MODEL || process.env.AI_GATEWAY_MODEL || DEFAULT_MODEL;

  return {
    apiKey,
    baseURL,
    defaultModel,
  };
}

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/chat - Stream AI chat responses
 *
 * Implements AI SDK UI best practices:
 * - Uses streamText from AI SDK Core for proper streaming
 * - Compatible with DefaultChatTransport and useChat hook
 * - Returns UIMessageStream protocol with proper SSE formatting
 * - Full type safety and error handling
 *
 * @param req - Next.js request object containing ChatRequest
 * @returns Server-Sent Events stream compatible with useChat hook
 */
export async function POST(req: Request): Promise<Response> {
  try {
    // Parse and validate request body
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (bodyResult instanceof NextResponse) {
      return bodyResult;
    }

    const { messages, model: requestModel, context } = validateChatRequest(bodyResult);

    // Get and validate API configuration
    const config = getAPIConfiguration();
    const selectedModel = requestModel || config.defaultModel;

    // Authenticate user (for future features like user tracking)
    const supabase = await createSupabaseServerClient({
      allowCookieWrite: true,
    });
    await supabase.auth.getUser();

    // Convert UI messages to model format
    const modelMessages = await convertToModelMessages(messages);

    // Validate conversion result
    if (!modelMessages || !Array.isArray(modelMessages)) {
      console.error("Message conversion failed:", { messages, modelMessages });
      throw new APIError(
        "Failed to convert messages to model format",
        400,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (modelMessages.length === 0) {
      throw new APIError("No valid messages after conversion", 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Prepare system message
    const systemMessage = context ? `Context: ${context}` : "You are a helpful assistant.";

    // Create custom OpenAI-compatible provider for AI Gateway
    const provider = createOpenAI({
      name: "ai-gateway",
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });

    // Use AI SDK streamText for proper streaming with UIMessage protocol
    const result = streamText({
      model: provider(selectedModel),
      messages: [{ role: "system", content: systemMessage }, ...modelMessages],
      temperature: 0.7,
    });

    // Return proper UIMessageStream response compatible with useChat hook
    return result.toUIMessageStreamResponse({
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
      },
    });
  } catch (error) {
    // Log error for debugging (sensitive details hidden in production)
    console.error("Chat API Error:", {
      error: error instanceof Error ? error.message : String(error),
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });

    return handleAPIError(error);
  }
}
