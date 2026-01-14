import { API_ROUTES } from "@/lib/api/routes";
import { DEFAULT_FALLBACK_MODELS } from "@/lib/constants";

// ============================================================================
// Types
// ============================================================================

export interface Model {
  readonly id: string;
  readonly name: string;
  readonly provider?: string;
  readonly contextTokens?: number;
}

export interface ModelFetchError extends Error {
  readonly code: "FETCH_FAILED" | "INVALID_RESPONSE" | "NETWORK_ERROR";
  readonly status?: number;
}

export interface GroupedModels {
  readonly [provider: string]: ReadonlyArray<Model>;
}

// ============================================================================
// Constants
// ============================================================================

const MODEL_ID_SEPARATOR = "/" as const;
const DEFAULT_PROVIDER = "openai" as const;

const PROVIDER_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  mistral: "Mistral",
  deepseek: "DeepSeek",
  alibaba: "Alibaba",
  amazon: "Amazon",
  xai: "xAI",
  perplexity: "Perplexity",
  vercel: "Vercel",
  nvidia: "NVIDIA",
  moonshotai: "Moonshot AI",
} as const;

// ============================================================================
// Validation & Type Guards
// ============================================================================

function isValidModel(value: unknown): value is Model {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length > 0
  );
}

function isModelArray(value: unknown): value is Model[] {
  return Array.isArray(value) && value.every(isValidModel);
}

// ============================================================================
// Model Utilities
// ============================================================================

/**
 * Extracts provider from model ID with validation
 * @param modelId - Model identifier in format "provider/model-name"
 * @returns Provider name or default if extraction fails
 */
export function extractProvider(modelId: string): string {
  if (!modelId || typeof modelId !== "string") {
    return DEFAULT_PROVIDER;
  }

  const separatorIndex = modelId.indexOf(MODEL_ID_SEPARATOR);
  if (separatorIndex === -1 || separatorIndex === 0) {
    return DEFAULT_PROVIDER;
  }

  const provider = modelId.slice(0, separatorIndex).trim();
  return provider || DEFAULT_PROVIDER;
}

/**
 * Gets the provider from a model object
 * @param model - Model object
 * @returns Provider name from explicit field or extracted from ID
 */
export function getModelProvider(model: Model): string {
  return model.provider || extractProvider(model.id);
}

/**
 * Formats provider name for display with special case handling
 * @param provider - Raw provider identifier
 * @returns Human-readable provider name
 */
export function formatProviderName(provider: string): string {
  const normalized = provider.toLowerCase();
  return PROVIDER_DISPLAY_NAMES[normalized] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Groups models by provider and sorts alphabetically
 * @param models - Array of models to group
 * @returns Record of provider names to sorted model arrays
 */
export function groupModelsByProvider(models: ReadonlyArray<Model>): GroupedModels {
  // Group by provider
  const grouped = models.reduce<Record<string, Model[]>>((acc, model) => {
    const provider = getModelProvider(model);
    if (!acc[provider]) {
      acc[provider] = [];
    }
    acc[provider].push(model);
    return acc;
  }, {});

  // Sort providers alphabetically
  const sortedProviders = Object.keys(grouped).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Sort models within each provider by name
  const result: Record<string, Model[]> = {};
  for (const provider of sortedProviders) {
    result[provider] = grouped[provider].sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}

// ============================================================================
// API Client
// ============================================================================

function createModelFetchError(
  message: string,
  code: ModelFetchError["code"],
  status?: number
): ModelFetchError {
  const error = new Error(message) as unknown as ModelFetchError;
  Object.assign(error, { code, status });
  return error;
}

/**
 * Fetches available models from the API with proper error handling
 * @returns Promise resolving to array of models
 * @throws {ModelFetchError} When fetch fails or response is invalid
 */
export async function fetchModels(): Promise<Model[]> {
  try {
    const response = await fetch(API_ROUTES.MODELS, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.error("[Models] API error:", {
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString(),
      });

      throw createModelFetchError(
        `API returned ${response.status}: ${response.statusText}`,
        "FETCH_FAILED",
        response.status
      );
    }

    const data: unknown = await response.json();

    // Validate response structure
    let models: Model[];
    if (isModelArray(data)) {
      models = data;
    } else if (
      typeof data === "object" &&
      data !== null &&
      "models" in data &&
      isModelArray(data.models)
    ) {
      models = data.models;
    } else {
      console.error("[Models] Invalid response format:", {
        receivedType: typeof data,
        isArray: Array.isArray(data),
        timestamp: new Date().toISOString(),
      });

      throw createModelFetchError("Invalid response format from API", "INVALID_RESPONSE");
    }

    if (models.length === 0) {
      console.warn("[Models] API returned empty model list, using fallback");
      return [...DEFAULT_FALLBACK_MODELS];
    }

    return models;
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.name === "TimeoutError") {
      console.error("[Models] Request timeout after 10s");
      return [...DEFAULT_FALLBACK_MODELS];
    }

    // Handle network errors
    if (error instanceof TypeError) {
      console.error("[Models] Network error:", {
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      return [...DEFAULT_FALLBACK_MODELS];
    }

    // Re-throw ModelFetchError for upstream handling
    if ((error as ModelFetchError).code) {
      return [...DEFAULT_FALLBACK_MODELS];
    }

    // Unknown error
    console.error("[Models] Unexpected error:", error);
    return [...DEFAULT_FALLBACK_MODELS];
  }
}
