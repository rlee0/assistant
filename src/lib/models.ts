export type Model = {
  id: string;
  label: string;
  provider?: string;
  contextTokens?: number;
};

export async function fetchModels(): Promise<Model[]> {
  const res = await fetch("/api/models");
  if (!res.ok) {
    return [
      { id: "gpt-4o-mini", label: "GPT-4o mini", provider: "ai-gateway" },
      { id: "gpt-4o", label: "GPT-4o", provider: "ai-gateway" },
    ];
  }
  return res.json();
}
