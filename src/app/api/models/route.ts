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
  type?: string; // e.g., 'language', 'embedding', 'image'
  tags?: string[]; // e.g., ['vision', 'tool-use', 'reasoning']
  maxTokens?: number;
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
  context_window?: number;
  type?: string;
  tags?: string[];
  max_tokens?: number;
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
  const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
  type AnyLogLevel = (typeof LOG_LEVELS)[number];
  function resolveLogLevel(): AnyLogLevel {
    const envLevel = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || "")
      .toLowerCase()
      .trim();
    if (LOG_LEVELS.includes(envLevel as AnyLogLevel)) return envLevel as AnyLogLevel;
    return process.env.NODE_ENV === "production" ? "warn" : "debug";
  }
  function shouldLog(level: LogContext["level"]): boolean {
    const threshold = resolveLogLevel();
    return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(threshold);
  }

  const logEntry = {
    ...context,
  };

  if (!shouldLog(context.level)) return;

  if (context.level === "error") {
    console.error(JSON.stringify(logEntry));
  } else if (context.level === "warn") {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.info(JSON.stringify(logEntry));
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
  const contextTokens = raw.contextTokens ?? raw.context_tokens ?? raw.context_window;

  return {
    id,
    name,
    provider,
    contextTokens: typeof contextTokens === "number" ? contextTokens : undefined,
    type: raw.type?.trim(),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((tag): tag is string => typeof tag === "string")
      : undefined,
    maxTokens: typeof raw.max_tokens === "number" ? raw.max_tokens : undefined,
  };
}

// ============================================================================
// Gateway Fetchers
// ============================================================================

/**
 * Fetches model capabilities from Vercel AI Gateway /v1/models endpoint.
 * Returns enhanced models with capability tags.
 */
async function fetchCapabilitiesFromVercel(
  correlationId?: string
): Promise<
  Map<string, { type?: string; tags?: string[]; contextWindow?: number; maxTokens?: number }>
> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);
  const capabilities = new Map<
    string,
    { type?: string; tags?: string[]; contextWindow?: number; maxTokens?: number }
  >();

  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      signal: controller.signal,
    });

    if (!response.ok) {
      structuredLog({
        level: "warn",
        source: "custom-gateway",
        timestamp: new Date().toISOString(),
        correlationId,
        message: "Failed to fetch capabilities from Vercel AI Gateway",
        details: { status: response.status },
      });
      return capabilities;
    }

    const data = await response.json();

    if (data && Array.isArray(data.data)) {
      for (const model of data.data) {
        if (model.id) {
          capabilities.set(model.id, {
            type: model.type,
            tags: Array.isArray(model.tags) ? model.tags : undefined,
            contextWindow:
              typeof model.context_window === "number" ? model.context_window : undefined,
            maxTokens: typeof model.max_tokens === "number" ? model.max_tokens : undefined,
          });
        }
      }
    }

    const reasoningModels = Array.from(capabilities.entries())
      .filter(([_, cap]) => cap.tags?.includes("reasoning"))
      .map(([id]) => id);

    structuredLog({
      level: "info",
      source: "custom-gateway",
      timestamp: new Date().toISOString(),
      correlationId,
      message: "Successfully fetched model capabilities from Vercel AI Gateway",
      details: {
        totalModels: capabilities.size,
        reasoningModels: reasoningModels.length,
        sampleReasoningModels: reasoningModels.slice(0, 5),
      },
    });
  } catch (error) {
    structuredLog({
      level: "warn",
      source: "custom-gateway",
      timestamp: new Date().toISOString(),
      correlationId,
      message: "Error fetching capabilities from Vercel AI Gateway",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  return capabilities;
}

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

    // Fetch capabilities from Vercel AI Gateway in parallel
    const capabilitiesPromise = fetchCapabilitiesFromVercel(correlationId);

    // Try custom gateway first
    let models: Model[] | null = null;
    if (gatewayUrl && apiKey) {
      models = await fetchFromCustomGateway(gatewayUrl, apiKey, correlationId);
    }

    // Fallback to SDK gateway if custom gateway failed
    if (!models || models.length === 0) {
      models = await fetchFromSdkGateway(correlationId);
    }

    // Fallback to default models if all sources failed
    if (!models || models.length === 0) {
      models = FALLBACK_MODELS;
    }

    // Merge capabilities from Vercel AI Gateway
    const capabilities = await capabilitiesPromise;
    const enhancedModels = models.map((model) => {
      const capability = capabilities.get(model.id);
      if (capability) {
        return {
          ...model,
          type: model.type || capability.type,
          tags: model.tags || capability.tags,
          contextTokens: model.contextTokens || capability.contextWindow,
          maxTokens: model.maxTokens || capability.maxTokens,
        };
      }
      return model;
    });

    return NextResponse.json(enhancedModels, {
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
