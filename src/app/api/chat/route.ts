import { APIError, handleAPIError, ErrorCodes } from "@/lib/api/errors";
import { NextRequest } from "next/server";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";
import { DEFAULT_MODEL } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { convertToModelMessages, streamText, type UIMessage, type Tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as toolFactories from "@/tools";

/**
 * Determine if an entry from the tools module is a tool factory.
 */
type ToolFactory = () => Tool;

/**
 * Determine if an entry from the tools module is a tool factory.
 */
function isToolFactory(entry: [string, unknown]): entry is [string, ToolFactory] {
  const [name, value] = entry;
  return name !== "defaultToolSettings" && typeof value === "function";
}

/**
 * Build a map of available tools by invoking all exported tool factories.
 * Tools are instantiated once at module load to avoid per-request overhead.
 */
function buildTools(): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(toolFactories)
      .filter(isToolFactory)
      .map(([name, factory]) => [name, factory()])
  );
}

const tools = buildTools();

/**
 * Type-safe request validation
 */
interface ChatRequest {
  readonly messages: readonly UIMessage[];
  readonly model?: string;
  readonly context?: string;
}

/**
 * Validates the chat request body structure
 * Provides detailed error messages for debugging
 *
 * @throws APIError if validation fails
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

  if ((messages as unknown[]).length === 0) {
    throw new APIError("Messages array cannot be empty", 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (model !== undefined && !validateString(model, true)) {
    throw new APIError("Model must be a non-empty string", 400, ErrorCodes.VALIDATION_ERROR);
  }

  if (context !== undefined && !validateString(context, true)) {
    throw new APIError("Context must be a non-empty string", 400, ErrorCodes.VALIDATION_ERROR);
  }

  return { messages: messages as readonly UIMessage[], model, context };
}

/**
 * Retrieves and validates AI Gateway configuration from environment variables
 * Centralizes configuration logic for easy testing and debugging
 *
 * @throws APIError if required configuration is missing
 */
function getAPIConfiguration() {
  const apiKey =
    process.env.AI_GATEWAY_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.AZURE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new APIError(
      "AI provider API key is not configured. " +
        "Please set one of: AI_GATEWAY_API_KEY, OPENAI_API_KEY, or AZURE_OPENAI_API_KEY.",
      500,
      ErrorCodes.INTERNAL_ERROR
    );
  }

  const baseURL = process.env.AI_GATEWAY_URL;
  if (!baseURL) {
    throw new APIError(
      "AI_GATEWAY_URL environment variable is not configured",
      500,
      ErrorCodes.INTERNAL_ERROR
    );
  }

  const defaultModel = process.env.AI_MODEL ?? process.env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL;

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
 * - Proper request validation and resource cleanup
 *
 * @param req - Next.js request object containing ChatRequest
 * @returns Server-Sent Events stream compatible with useChat hook
 */
export async function POST(req: Request): Promise<Response> {
  const isDevelopment = process.env.NODE_ENV === "development";
  const requestId = crypto.randomUUID();

  try {
    // Parse and validate request body
    const bodyResult = await parseRequestBody(req as NextRequest);
    if (!bodyResult.ok) {
      throw bodyResult.error;
    }

    const { messages, model: requestModel, context } = validateChatRequest(bodyResult.value);

    // Get and validate API configuration
    const config = getAPIConfiguration();
    const selectedModel = requestModel || config.defaultModel;

    // Authenticate user (for future features like user tracking)
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient({
        allowCookieWrite: true,
      });
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (error) {
      // Authentication is not required for chat, but log if it fails
      if (isDevelopment) {
        console.debug("[Chat] User authentication failed (optional):", error);
      }
    }

    // Convert UI messages to model format
    let modelMessages;
    try {
      // Convert readonly array to mutable for AI SDK compatibility
      modelMessages = await convertToModelMessages([...messages]);
    } catch (error) {
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new APIError(
        "Failed to convert messages to model format",
        400,
        ErrorCodes.VALIDATION_ERROR,
        cause
      );
    }

    // Validate conversion result
    if (!modelMessages || !Array.isArray(modelMessages) || modelMessages.length === 0) {
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
    const model = provider.chat(selectedModel as Parameters<typeof provider.chat>[0]);

    // Use AI SDK streamText for proper streaming via chat/completions
    const result = streamText({
      model,
      messages: [{ role: "system", content: systemMessage }, ...modelMessages],
      temperature: 0.7,
      tools,
      // Allow multiple steps: tool call -> tool result -> final text response
      // Without this, it stops after the first step (tool call only)
      stopWhen: [],
      onStepFinish: (step) => {
        if (isDevelopment) {
          console.debug("[Chat] Step finished:", {
            requestId,
            toolCallsCount: step.toolCalls?.length ?? 0,
            toolResultsCount: step.toolResults?.length ?? 0,
            finishReason: step.finishReason,
            hasText: !!step.text,
            textLength: step.text?.length ?? 0,
          });
        }
      },
    });

    // Log streaming initiation in development
    if (isDevelopment) {
      console.debug("[Chat] Stream started:", {
        requestId,
        userId: userId ? "authenticated" : "anonymous",
        model: selectedModel,
        messageCount: messages.length,
      });
    }

    // Return UIMessageStream response expected by DefaultChatTransport/useChat
    return result.toUIMessageStreamResponse({
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
        "x-request-id": requestId,
      },
      messageMetadata: ({ part }) => {
        if (part.type === "finish") {
          return {
            model: selectedModel,
            totalTokens: part.totalUsage?.totalTokens ?? 0,
            inputTokens: part.totalUsage?.inputTokens ?? 0,
            outputTokens: part.totalUsage?.outputTokens ?? 0,
          };
        }
      },
      onError: (error) => {
        console.error("[Chat] Stream error:", {
          requestId,
          error: error instanceof Error ? error.message : String(error),
        });
        return "An error occurred while processing your request.";
      },
    });
  } catch (error) {
    // Enhanced error logging with request context
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[Chat API Error]:", {
      requestId,
      message: errorMessage,
      ...(isDevelopment && error instanceof Error && { stack: error.stack }),
    });

    return handleAPIError(error, { requestId, isDevelopment });
  }
}
