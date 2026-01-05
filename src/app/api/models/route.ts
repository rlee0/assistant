import { NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";

interface Model {
  id: string;
  name: string;
  provider?: string;
  contextTokens?: number;
}

const DEFAULT_MODELS = await gateway.getAvailableModels();

export async function GET() {
  try {
    const gatewayUrl = process.env.AI_GATEWAY_URL;
    const apiKey = process.env.AI_GATEWAY_API_KEY;

    if (gatewayUrl && apiKey) {
      try {
        const response = await fetch(`${gatewayUrl}/models`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          cache: "no-store",
        });

        if (response.ok) {
          const data = (await response.json()) as { models?: Model[] };
          if (Array.isArray(data.models) && data.models.length > 0) {
            return NextResponse.json(data.models, { status: 200 });
          }
        }
      } catch (error) {
        console.error("Failed to fetch models from gateway:", error);
      }
    }

    // Return default models as fallback
    return NextResponse.json(DEFAULT_MODELS, { status: 200 });
  } catch (error) {
    console.error("Models endpoint error:", error);
    return NextResponse.json(DEFAULT_MODELS, { status: 200 });
  }
}
