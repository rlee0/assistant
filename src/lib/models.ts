import { DEFAULT_FALLBACK_MODELS } from "@/lib/constants";

export type Model = {
  id: string;
  name: string;
  provider?: string;
  contextTokens?: number;
};

export async function fetchModels(): Promise<Model[]> {
  try {
    const res = await fetch("/api/models");
    if (!res.ok) {
      return [...DEFAULT_FALLBACK_MODELS];
    }
    const data = await res.json();
    // Ensure response is always an array
    return Array.isArray(data)
      ? data
      : Array.isArray(data.models)
      ? data.models
      : [...DEFAULT_FALLBACK_MODELS];
  } catch {
    return [...DEFAULT_FALLBACK_MODELS];
  }
}
