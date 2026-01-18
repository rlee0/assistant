import { APIError, handleAPIError, ErrorCodes } from "@/lib/api/errors";
import { NextRequest } from "next/server";
import { validateArray, validateObject, validateString } from "@/lib/api/validation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { parseRequestBody } from "@/lib/api/middleware";
import { logError, logDebug } from "@/lib/logging";
import { convertToModelMessages, generateText, createGateway, type UIMessage } from "ai";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 100,
  MAX_SUGGESTIONS: 5,
  MAX_CONTEXT_MESSAGES: 6,
  MAX_RESPONSE_LENGTH: 5000,
  TEMPERATURE: 0.7,
  TIMEOUT_MS: 30000,
} as const;

const SYSTEM_PROMPT = `Generate 3-5 concise follow-up suggestions based on this conversation.
Mix of: clarifying questions, next steps, related topics, applications.
Keep each under 60 characters.
Return as JSON array of strings: ["suggestion 1", "suggestion 2", ...]`;

// ============================================================================
// Helper Functions
// ============================================================================

function getRecentMessages(messages: readonly UIMessage[]): UIMessage[] {
  return messages.length <= CONFIG.MAX_CONTEXT_MESSAGES
    ? [...messages]
    : messages.slice(-CONFIG.MAX_CONTEXT_MESSAGES);
}

function isValidSuggestion(text: string): boolean {
  return (
    typeof text === "string" &&
    text.trim().length >= CONFIG.MIN_LENGTH &&
    text.length <= CONFIG.MAX_LENGTH
  );
}

function parseSuggestions(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(isValidSuggestion)
        .slice(0, CONFIG.MAX_SUGGESTIONS);
    }
  } catch {
    // Fallback to line-by-line parsing
  }

  return text
    .split(/[\n,]/)
    .map((line) =>
      line
        .trim()
        .replace(/^[-•*"']\s*/, "")
        .replace(/["']$/, "")
    )
    .filter(isValidSuggestion)
    .slice(0, CONFIG.MAX_SUGGESTIONS);
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Authenticate
    const supabase = await createSupabaseServerClient({ allowCookieWrite: true });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new APIError("Authentication required", 401, ErrorCodes.UNAUTHORIZED);
    }

    // Parse request
    const bodyResult = await parseRequestBody(request);
    if (!bodyResult.ok) throw bodyResult.error;

    const body = bodyResult.value;
    if (!validateObject(body)) {
      throw new APIError("Invalid request body", 400, ErrorCodes.VALIDATION_ERROR);
    }
    if (!validateArray(body.messages)) {
      throw new APIError("Invalid messages", 400, ErrorCodes.VALIDATION_ERROR);
    }
    if (!validateString(body.model)) {
      throw new APIError("Invalid model", 400, ErrorCodes.VALIDATION_ERROR);
    }

    const messages = body.messages as UIMessage[];
    const model = body.model as string;

    if (messages.length === 0) {
      throw new APIError("Messages required", 400, ErrorCodes.VALIDATION_ERROR);
    }

    // Get API config
    const apiKey = process.env.AI_GATEWAY_API_KEY;
    const baseURL = process.env.AI_GATEWAY_URL;

    if (!apiKey || !baseURL) {
      throw new APIError("Service not configured", 500, ErrorCodes.INTERNAL_ERROR);
    }

    logDebug("[Suggestions]", `Model: ${model}, Messages: ${messages.length}`);

    // Create gateway - use same pattern as chat route
    const gatewayConfig: { apiKey: string; baseURL?: string } = { apiKey };

    // Only override baseURL if not using Vercel's default gateway
    if (!baseURL.includes("ai-gateway.vercel.sh")) {
      gatewayConfig.baseURL = baseURL;
    }

    const gateway = createGateway(gatewayConfig);

    // Generate suggestions
    const result = await generateText({
      model: gateway(model),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(getRecentMessages(messages)),
      temperature: CONFIG.TEMPERATURE,
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(CONFIG.TIMEOUT_MS),
    });

    // Parse and validate
    if (!result.text || result.text.length > CONFIG.MAX_RESPONSE_LENGTH) {
      logError(
        "[Suggestions]",
        "Invalid response length",
        new Error(`Length: ${result.text?.length ?? 0}`)
      );
      throw new APIError("Failed to generate suggestions", 500, ErrorCodes.INTERNAL_ERROR);
    }

    const suggestions = parseSuggestions(result.text);

    if (suggestions.length === 0) {
      logError("[Suggestions]", "No valid suggestions", new Error(result.text));
      throw new APIError("Failed to generate suggestions", 500, ErrorCodes.INTERNAL_ERROR);
    }

    logDebug("[Suggestions]", `Generated ${suggestions.length} suggestions`);

    return Response.json({ suggestions });
  } catch (error) {
    return handleAPIError(error, { requestId });
  }
}
