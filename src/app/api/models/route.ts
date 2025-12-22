import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (process.env.AI_GATEWAY_URL && process.env.AI_GATEWAY_API_KEY) {
      const res = await fetch(`${process.env.AI_GATEWAY_URL}/models`, {
        headers: {
          Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data: { models?: Array<{ id?: string; name?: string; provider?: string; contextTokens?: number }> } =
          await res.json();
        if (data.models) {
          return NextResponse.json(
            data.models.map((m) => ({
              id: m.id ?? m.name ?? "model",
              label: m.name ?? m.id ?? "Model",
              provider: m.provider ?? "ai-gateway",
              contextTokens: m.contextTokens,
            }))
          );
        }
      }
    }
  } catch (error) {
    console.error("Model fetch error", error);
  }

  return NextResponse.json(
    [
      { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "ai-gateway" },
      { id: "gpt-4o", label: "GPT-4o", provider: "ai-gateway" },
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet", provider: "ai-gateway" },
    ],
    { status: 200 }
  );
}
