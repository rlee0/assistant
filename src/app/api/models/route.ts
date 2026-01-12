import { NextResponse } from "next/server";
import { gateway } from "@ai-sdk/gateway";

interface Model {
  id: string;
  name: string;
  provider?: string;
  contextTokens?: number;
}

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
    const defaultModels = await gateway.getAvailableModels();
    // Ensure always returning an array
    const modelsArray = Array.isArray(defaultModels) ? defaultModels : defaultModels?.models || [];
    return NextResponse.json(
      modelsArray.length > 0 ? modelsArray : [{ id: "gpt-4o-mini", name: "GPT-4o mini" }],
      { status: 200 }
    );
  } catch (error) {
    console.error("Models endpoint error:", error);
    // Return minimal fallback on error
    return NextResponse.json([{ id: "gpt-4o-mini", name: "GPT-4o mini" }], { status: 200 });
  }
}
