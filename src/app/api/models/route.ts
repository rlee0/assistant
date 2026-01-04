import { NextResponse } from "next/server";

interface Model {
  id: string;
  name?: string;
  provider?: string;
  contextTokens?: number;
}

interface ModelResponse {
  id: string;
  label: string;
  provider: string;
  contextTokens?: number;
}

const DEFAULT_MODELS: ModelResponse[] = [
  { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "ai-gateway" },
  { id: "gpt-4o", label: "GPT-4o", provider: "ai-gateway" },
  { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "ai-gateway" },
];

function transformModel(model: Model): ModelResponse {
  return {
    id: model.id ?? model.name ?? "model",
    label: model.name ?? model.id ?? "Model",
    provider: model.provider ?? "ai-gateway",
    contextTokens: model.contextTokens,
  };
}

export async function GET() {
  try {
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (gatewayUrl && apiKey) {
      const response = await fetch(`${gatewayUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = (await response.json()) as { models?: Model[] };
        if (Array.isArray(data.models) && data.models.length > 0) {
          return NextResponse.json(data.models.map(transformModel));
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch models from gateway:", error);
  }

  return NextResponse.json(DEFAULT_MODELS, { status: 200 });
}
