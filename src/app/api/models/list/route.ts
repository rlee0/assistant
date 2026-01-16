/**
 * @deprecated This endpoint is superseded by /api/models which provides better error handling,
 * caching, and multiple fallback strategies. Use /api/models instead.
 * This file will be removed in a future version.
 */

import { APIError, ErrorCodes } from "@/lib/api/errors";

import { NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";
import { logError } from "@/lib/logging";
import { validateArray } from "@/lib/api/validation";

/**
 * Type-safe model representation
 */
interface Model {
  id: string;
  label: string;
  provider?: string;
  contextTokens?: number;
}

/**
 * Validates model data structure
 */
function isValidModel(model: unknown): model is Model {
  if (typeof model !== "object" || model === null) return false;
  const m = model as Record<string, unknown>;
  return typeof m.id === "string" && typeof m.label === "string";
}

/**
 * Validates models array
 */
function validateModels(models: unknown): models is Model[] {
  return validateArray(models) && models.every(isValidModel);
}

/**
 * Fetch available models from AI Gateway
 * Falls back to local defaults if gateway is unavailable
 * @throws {APIError} On configuration errors
 */
async function fetchGatewayModels(): Promise<Model[]> {
  const gatewayUrl = process.env.AI_GATEWAY_URL;
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!gatewayUrl || !apiKey) {
    // Gateway not configured, use defaults
    return getDefaultModels();
  }

  try {
    const response = await fetch(`${gatewayUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new APIError(
        `AI Gateway returned ${response.status}`,
        response.status,
        ErrorCodes.INTERNAL_ERROR
      );
    }

    const data = (await response.json()) as unknown;

    // Validate response structure
    if (typeof data !== "object" || data === null) {
      throw new Error("Invalid response format from AI Gateway");
    }

    const models = (data as Record<string, unknown>).models;
    if (!validateModels(models)) {
      throw new Error("Invalid model data from AI Gateway");
    }

    return models.length > 0 ? models : getDefaultModels();
  } catch (error) {
    // Log error for debugging
    logError("[Models:list]", "Failed to fetch models from AI Gateway", error, {
      url: gatewayUrl,
    });

    // Return defaults on any error
    return getDefaultModels();
  }
}

/**
 * Get default models from AI SDK
 */
async function getDefaultModels(): Promise<Model[]> {
  try {
    const models = await gateway.getAvailableModels();
    return validateModels(models) ? models : [];
  } catch (error) {
    logError("[Models:list]", "Failed to get default models from gateway", error);
    return [];
  }
}

/**
 * GET /api/models/list - List available AI models
 *
 * Fetches available models from the configured AI Gateway with fallback to
 * AI SDK defaults. Returns an empty array if all sources fail.
 *
 * @returns {Model[]} Array of available models
 */
export async function GET(): Promise<NextResponse> {
  try {
    const models = await fetchGatewayModels();
    return NextResponse.json(models, { status: 200 });
  } catch (error) {
    // Log error for debugging but return gracefully
    logError("[Models:list]", "Models endpoint error", error, {
      ...(process.env.NODE_ENV === "development" && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
    });

    // Return graceful error response with empty models array
    return NextResponse.json(
      {
        error: "Unable to fetch models at this time",
        code: ErrorCodes.INTERNAL_ERROR,
        models: [],
      },
      { status: 503 }
    );
  }
}
