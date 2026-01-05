import { DEFAULT_FALLBACK_MODELS } from "@/lib/constants";

export type Model = {
  id: string;
  name: string;
  provider?: string;
  contextTokens?: number;
};

export async function fetchModels(): Promise<Model[]> {
  const res = await fetch("/api/models");
  if (!res.ok) {
    return [...DEFAULT_FALLBACK_MODELS];
  }
  return res.json();
}
