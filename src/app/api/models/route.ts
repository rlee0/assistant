import { NextResponse, type NextRequest } from "next/server";
import { gateway } from "@ai-sdk/gateway";

// ============================================================================
// Types
// ============================================================================

/**
 * Represents an AI model available through the gateway.
 */
interface Model {
  id: string;
  name: string;
  provider?: string;
  contextTokens?: number;
}

/**
 * Raw model structure from external API (before normalization).
 */
interface RawGatewayModel {
  id?: string;
  name?: string;
  provider?: string;
  contextTokens?: number;
  context_tokens?: number;
  [key: string]: unknown;
}

/**
 * Gateway API response structure for models endpoint.
 */
interface GatewayModelsResponse {
  models?: RawGatewayModel[];
}

/**
 * Structured log context with optional request tracing.
 */
interface LogContext {
  level: "error" | "warn" | "info";
  source: "custom-gateway" | "sdk-gateway" | "route-handler";
  message: string;
  timestamp: string;
  correlationId?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum set of fallback models when all sources fail */
const FALLBACK_MODELS: Model[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "openai",
  },
];

/** Timeout for external gateway requests (ms) */
const GATEWAY_TIMEOUT_MS = 10000;

/** Cache duration for model list response (seconds) */
const CACHE_DURATION_SECONDS = 3600; // 1 hour

// ============================================================================
// Logger
// ============================================================================

/**
 * Structured logger for observability.
 * Formats logs as JSON with optional request correlation.
 */
function structuredLog(context: LogContext): void {
  const logEntry = {
    ...context,
  };

  if (context.level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (context.level === "warn") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Extracts correlation ID from request headers for distributed tracing.
 */
function extractCorrelationId(request?: NextRequest): string | undefined {
  if (!request) return undefined;

  return (
    request.headers.get("x-correlation-id") || request.headers.get("x-request-id") || undefined
  );
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to validate raw model has minimum required fields.
 */
function isValidRawModel(value: unknown): value is RawGatewayModel {
  return value !== null && typeof value === "object" && ("id" in value || "name" in value);
}

/**
 * Type guard to validate GatewayModelsResponse structure.
 */
function isGatewayModelsResponse(value: unknown): value is GatewayModelsResponse {
  if (value === null || typeof value !== "object") {
    return false;
  }

  // Allow empty object or object with models array
  if (Object.keys(value).length === 0) {
    return true;
  }

  if (!("models" in value)) {
    return false;
  }

  const response = value as GatewayModelsResponse;
  return (
    response.models === undefined ||
    (Array.isArray(response.models) && response.models.every(isValidRawModel))
  );
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Extracts provider from model ID (e.g., "openai:gpt-4o" -> "openai").
 * Pure function with no side effects.
 */
function extractProviderFromId(id: string): string | undefined {
  if (!id.includes(":")) {
    return undefined;
  }

  const [provider] = id.split(":", 2);
  return provider.trim() || undefined;
}

/**
 * Normalizes a raw model object into the standard Model format.
 * Pure function with defensive validation.
 */
function normalizeModel(raw: RawGatewayModel): Model | null {
  // Extract required fields with fallbacks
  const id = raw.id?.trim() || raw.name?.trim();
  const name = raw.name?.trim() || raw.id?.trim();

  // Validate required fields exist
  if (!id || !name) {
    return null;
  }

  // Determine provider from explicit field or extract from ID
  const provider = raw.provider?.trim() || extractProviderFromId(id);

  // Handle both naming conventions for context tokens
  const contextTokens = raw.contextTokens ?? raw.context_tokens;

  return {
    id,
    name,
    provider,
    contextTokens: typeof contextTokens === "number" ? contextTokens : undefined,
  };
}

// ============================================================================
// Gateway Fetchers
// ============================================================================

/**
 * Attempts to fetch models from the custom AI Gateway endpoint.
 * Returns null if gateway URL/key missing or request fails.
 */
async function fetchFromCustomGateway(
  gatewayUrl: string,
  apiKey: string,
  correlationId?: string
): Promise<Model[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(`${gatewayUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(correlationId && { "x-correlation-id": correlationId }),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      structuredLog({
        level: "error",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "HTTP error from custom gateway",
        details: {
          status: response.status,
          statusText: response.statusText,
          url: gatewayUrl,
        },
      });
      return null;
    }

    const data: unknown = await response.json();

    if (!isGatewayModelsResponse(data)) {
      structuredLog({
        level: "error",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "Invalid response structure from custom gateway",
        details: {
          receivedType: typeof data,
          url: gatewayUrl,
        },
      });
      return null;
    }

    // Type assertion safe after guard
    if (!Array.isArray(data.models) || data.models.length === 0) {
      return null;
    }

    // Normalize all models, filtering out invalid ones
    const normalizedModels = data.models
      .map(normalizeModel)
      .filter((model): model is Model => model !== null);

    if (normalizedModels.length === 0) {
      structuredLog({
        level: "warn",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "No valid models after normalization",
        details: { rawCount: data.models.length },
      });
      return null;
    }

    return normalizedModels;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      structuredLog({
        level: "warn",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "Custom gateway request timeout",
        details: { timeoutMs: GATEWAY_TIMEOUT_MS },
      });
    } else if (error instanceof Error) {
      structuredLog({
        level: "error",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "Failed to fetch models from custom gateway",
        details: {
          errorName: error.name,
          errorMessage: error.message,
          url: gatewayUrl,
        },
      });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetches models from the AI SDK gateway as fallback.
 * Returns empty array on failure (graceful degradation).
 */
async function fetchFromSdkGateway(correlationId?: string): Promise<Model[]> {
  try {
    const defaultModels: unknown = await gateway.getAvailableModels();

    // Extract raw models array from response
    let rawModels: RawGatewayModel[] = [];

    if (Array.isArray(defaultModels)) {
      rawModels = defaultModels.filter(isValidRawModel);
    } else if (isGatewayModelsResponse(defaultModels) && Array.isArray(defaultModels.models)) {
      rawModels = defaultModels.models;
    }

    if (rawModels.length === 0) {
      // Expected case - not an error
      return [];
    }

    // Normalize all models, filtering out invalid ones
    const normalizedModels = rawModels
      .map(normalizeModel)
      .filter((model): model is Model => model !== null);

    if (normalizedModels.length === 0) {
      structuredLog({
        level: "warn",
        source: "sdk-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "No valid models after normalization",
        details: { rawCount: rawModels.length },
      });
    }

    return normalizedModels;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    structuredLog({
      level: "error",
      source: "sdk-gateway",
      timestamp: new Date().toISOString(),
      correlationId,
      message: "Failed to fetch models from SDK gateway",
      details: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage,
      },
    });

    return [];
  }
}

// ============================================================================
// Route Handler
// ============================================================================

/**
 * GET /api/models
 *
 * Returns a list of available AI models.
 *
 * Resolution order:
 * 1. Custom AI Gateway endpoint (if configured)
 * 2. AI SDK gateway fallback
 * 3. Minimal fallback model
 *
 * HTTP Caching:
 * - Successful responses cached for 1 hour
 * - Errors never cached (client retries immediately)
 *
 * @param request Optional - for request correlation tracing
 * @returns {NextResponse} JSON array of Model objects
 */
export async function GET(request?: NextRequest): Promise<NextResponse<Model[]>> {
  const correlationId = extractCorrelationId(request);

  try {
    const gatewayUrl = process.env.AI_GATEWAY_URL?.trim();
    const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();

    // Try custom gateway first
    if (gatewayUrl && apiKey) {
      const customModels = await fetchFromCustomGateway(gatewayUrl, apiKey, correlationId);
      if (customModels && customModels.length > 0) {
        return NextResponse.json(customModels, {
          status: 200,
          headers: {
            "cache-control": `public, max-age=${CACHE_DURATION_SECONDS}`,
          },
        });
      }
    }

    // Fallback to SDK gateway
    const sdkModels = await fetchFromSdkGateway(correlationId);
    if (sdkModels.length > 0) {
      return NextResponse.json(sdkModels, {
        status: 200,
        headers: {
          "cache-control": `public, max-age=${CACHE_DURATION_SECONDS}`,
        },
      });
    }

    // Final fallback
    return NextResponse.json(FALLBACK_MODELS, {
      status: 200,
      headers: {
        "cache-control": `public, max-age=${CACHE_DURATION_SECONDS}`,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unexpected error in route handler";

    structuredLog({
      level: "error",
      source: "route-handler",
      timestamp: new Date().toISOString(),
      correlationId,
      message: errorMessage,
      details: {
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      },
    });

    // Always return at least fallback models even on error, but don't cache
    return NextResponse.json(FALLBACK_MODELS, {
      status: 500,
      headers: {
        "cache-control": "no-cache, must-revalidate",
      },
    });
  }
}
