import { NextResponse } from "next/server";
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
 * Gateway API response structure for models endpoint.
 */
interface GatewayModelsResponse {
  models?: Model[];
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum set of fallback models when all sources fail */
const FALLBACK_MODELS: Model[] = [{ id: "gpt-4o-mini", name: "GPT-4o mini" }];

/** Timeout for external gateway requests (ms) */
const GATEWAY_TIMEOUT_MS = 10000;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Type guard to validate GatewayModelsResponse structure.
 */
function isGatewayModelsResponse(value: unknown): value is GatewayModelsResponse {
  return (
    value !== null &&
    typeof value === "object" &&
    ("models" in value || Object.keys(value).length === 0)
  );
}

/**
 * Attempts to fetch models from the custom AI Gateway endpoint.
 * Returns null if gateway URL/key missing or request fails.
 */
async function fetchFromCustomGateway(gatewayUrl: string, apiKey: string): Promise<Model[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MS);

  try {
    const response = await fetch(`${gatewayUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!isGatewayModelsResponse(data)) {
      return null;
    }

    if (Array.isArray(data.models) && data.models.length > 0) {
      return data.models;
    }
  } catch (error) {
    if (error instanceof Error && error.name !== "AbortError") {
      console.error("Failed to fetch models from custom gateway:", error.message);
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return null;
}

/**
 * Fetches models from the AI SDK gateway as fallback.
 * Ensures response is always an array.
 */
async function fetchFromSdkGateway(): Promise<Model[]> {
  try {
    const defaultModels = await gateway.getAvailableModels();

    // Handle both array and object-wrapped responses
    if (Array.isArray(defaultModels)) {
      return defaultModels;
    }

    if (isGatewayModelsResponse(defaultModels)) {
      if (Array.isArray(defaultModels.models)) {
        return defaultModels.models;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Failed to fetch models from SDK gateway:", error.message);
    } else {
      console.error("Failed to fetch models from SDK gateway:", String(error));
    }
  }

  return [];
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
 * @returns {NextResponse} JSON array of Model objects
 */
export async function GET(): Promise<NextResponse<Model[]>> {
  try {
    const gatewayUrl = process.env.AI_GATEWAY_URL?.trim();
    const apiKey = process.env.AI_GATEWAY_API_KEY?.trim();

    // Try custom gateway first
    if (gatewayUrl && apiKey) {
      const customModels = await fetchFromCustomGateway(gatewayUrl, apiKey);
      if (customModels && customModels.length > 0) {
        return NextResponse.json(customModels, { status: 200 });
      }
    }

    // Fallback to SDK gateway
    const sdkModels = await fetchFromSdkGateway();
    if (sdkModels.length > 0) {
      return NextResponse.json(sdkModels, { status: 200 });
    }

    // Final fallback
    return NextResponse.json(FALLBACK_MODELS, { status: 200 });
  } catch (error) {
    // Log unexpected errors but don't expose to client
    if (error instanceof Error) {
      console.error("Models endpoint error:", error.message);
    } else {
      console.error("Models endpoint error:", String(error));
    }

    // Always return at least fallback models even on error
    return NextResponse.json(FALLBACK_MODELS, { status: 200 });
  }
}
