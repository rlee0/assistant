import { APIError, handleAPIError, ErrorCodes } from "@/lib/api/errors";
import { NextRequest } from "next/server";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";
import { DEFAULT_MODEL } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { logError, logDebug } from "@/lib/logging";
import {
  convertToModelMessages,
  streamText,
  createGateway,
  type UIMessage,
  type Tool,
  type LanguageModelUsage,
} from "ai";
import { isReasoningCapable, extractProvider, fetchModels } from "@/lib/models";
import * as toolFactories from "@/features/chat/tools";

/**
 * Tool factory function type
 */
type ToolFactory = () => Tool;

/**
 * Type guard to check if a tools module export is a tool factory
 */
function isToolFactory(entry: [string, unknown]): entry is [string, ToolFactory] {
  const [name, value] = entry;
  return name !== "defaultToolSettings" && typeof value === "function";
}

/**
 * Build tools registry by invoking all exported tool factories
 * Tools are instantiated per-request to allow per-request configuration
 */
function buildTools(): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(toolFactories)
      .filter(isToolFactory)
      .map(([name, factory]) => [name, factory()])
  );
}

/**
 * Validated chat request structure
 */
interface ChatRequest {
  readonly messages: readonly UIMessage[];
  readonly model?: string;
  readonly context?: string;
}

/**
 * Type guard for chat request body
 */
function isChatRequestBody(
  body: Record<string, unknown>
): body is { messages: unknown; model?: unknown; context?: unknown } {
  return "messages" in body;
}

/**
 * Validates and types the chat request body
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

  if (!isChatRequestBody(body)) {
    throw new APIError("Request body must contain messages", 400, ErrorCodes.VALIDATION_ERROR);
  }

  const { messages, model, context } = body;

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

  return {
    messages: messages as readonly UIMessage[],
    model: model as string | undefined,
    context: context as string | undefined,
  };
}

/**
 * API configuration from environment
 */
interface APIConfiguration {
  readonly apiKey: string;
  readonly baseURL: string;
  readonly defaultModel: string;
}

/**
 * Retrieves and validates AI Gateway configuration
 *
 * @throws APIError if required configuration is missing
 */
function getAPIConfiguration(): APIConfiguration {
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

/**
 * Message metadata structure
 */
interface MessageMetadata {
  readonly model: string;
  readonly totalTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly usage: LanguageModelUsage;
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
    const selectedModel = requestModel ?? config.defaultModel;

    // Authenticate user - required for chat streaming
    const supabase = await createSupabaseServerClient({
      allowCookieWrite: true,
    });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError !== null || user === null) {
      throw new APIError("Authentication required to access chat", 401, ErrorCodes.UNAUTHORIZED);
    }

    const userId = user.id;

    // Convert UI messages to model format
    const modelMessages = await convertToModelMessages([...messages]).catch((error: unknown) => {
      const cause = error instanceof Error ? error : new Error(String(error));
      throw new APIError(
        "Failed to convert messages to model format",
        400,
        ErrorCodes.VALIDATION_ERROR,
        cause
      );
    });

    // Validate conversion result
    if (!Array.isArray(modelMessages) || modelMessages.length === 0) {
      throw new APIError("No valid messages after conversion", 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Prepare system message
    const systemMessage =
      context !== undefined ? `Context: ${context}` : "You are a helpful assistant.";

    // Build tools per-request to allow per-request configuration
    const tools = buildTools();

    // Create AI Gateway provider instance
    const gatewayConfig: { apiKey: string; baseURL?: string } = {
      apiKey: config.apiKey,
    };

    // Only set baseURL if using a custom gateway (not Vercel's)
    if (config.baseURL && !config.baseURL.includes("ai-gateway.vercel.sh")) {
      gatewayConfig.baseURL = config.baseURL;
    }
    // If using Vercel AI Gateway, don't override baseURL - let it use defaults

    const gateway = createGateway(gatewayConfig);
    const model = gateway(selectedModel);

    // Fetch model capabilities to determine if reasoning is supported
    let supportsReasoning = false;
    try {
      const models = await fetchModels();
      const currentModel = models.find((m) => m.id === selectedModel);
      supportsReasoning = currentModel
        ? isReasoningCapable(currentModel)
        : isReasoningCapable(selectedModel);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // Fallback to string-based check if model fetch fails
      supportsReasoning = isReasoningCapable(selectedModel);
    }

    const modelProvider = extractProvider(selectedModel);

    // Configure provider-specific reasoning options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const providerOptions: any = {};
    if (supportsReasoning) {
      if (modelProvider === "openai") {
        providerOptions.openai = {
          reasoningSummary: "detailed",
        };
      }
      if (modelProvider === "deepseek") {
        providerOptions.deepseek = {
          thinkingBudget: 10000,
        };
      }
      if (modelProvider === "anthropic") {
        providerOptions.anthropic = {
          thinking: { type: "enabled", budgetTokens: 12000 },
        };
      }
    }

    // Use AI SDK streamText for proper streaming via chat/completions
    const result = streamText({
      model,
      messages: [{ role: "system", content: systemMessage }, ...modelMessages],
      temperature: supportsReasoning ? undefined : 0.7, // Reasoning models don't support temperature
      tools,
      stopWhen: [],
      providerOptions,
      onStepFinish: (step) => {
        const debugInfo: Record<string, unknown> = {
          requestId,
          toolCallsCount: step.toolCalls?.length ?? 0,
          toolResultsCount: step.toolResults?.length ?? 0,
          finishReason: step.finishReason,
          hasText: step.text !== undefined && step.text.length > 0,
          textLength: step.text?.length ?? 0,
          hasReasoning: step.reasoning !== undefined && step.reasoning.length > 0,
          reasoningLength: step.reasoning?.length ?? 0,
        };

        logDebug("[Chat]", "Step finished", debugInfo);
      },
    });

    // Log streaming initiation
    logDebug("[Chat]", "Stream started", {
      requestId,
      userId,
      model: selectedModel,
      messageCount: messages.length,
      sendReasoning: true,
      supportsReasoning,
      modelProvider,
      hasProviderOptions: Object.keys(providerOptions).length > 0,
      providerOptions: Object.keys(providerOptions).length > 0 ? providerOptions : undefined,
    });

    // Return UIMessageStream response expected by DefaultChatTransport/useChat
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      headers: {
        "x-vercel-ai-ui-message-stream": "v1",
        "x-request-id": requestId,
      },
      messageMetadata: ({ part }): MessageMetadata | undefined => {
        // Log when reasoning parts are created
        const partAsRecord = part as Record<string, unknown>;
        if (partAsRecord.type === "reasoning") {
          logDebug("[Chat]", "📤 Sending reasoning part to client", {
            requestId,
            hasText: !!partAsRecord.text,
            textLength: typeof partAsRecord.text === "string" ? partAsRecord.text.length : 0,
          });
        }

        if (part.type === "finish" && part.totalUsage !== undefined) {
          return {
            model: selectedModel,
            totalTokens: part.totalUsage.totalTokens ?? 0,
            inputTokens: part.totalUsage.inputTokens ?? 0,
            outputTokens: part.totalUsage.outputTokens ?? 0,
            usage: part.totalUsage,
          };
        }
        return undefined;
      },
      onError: (error: unknown) => {
        logError("[Chat]", "Stream error", error, { requestId });
        return "An error occurred while processing your request.";
      },
    });
  } catch (error: unknown) {
    logError("[Chat API]", "Request processing failed", error, { requestId });
    return handleAPIError(error, { requestId, isDevelopment });
  }
}
