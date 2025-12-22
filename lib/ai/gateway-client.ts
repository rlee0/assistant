export async function fetchModels(): Promise<any[]> {
  const baseUrl = process.env.NEXT_PUBLIC_AI_GATEWAY_URL;
  const apiKey = process.env.AI_GATEWAY_API_KEY;

  if (!baseUrl) {
    console.warn('AI Gateway URL not configured');
    return [];
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || data || [];
  } catch (error) {
    console.error('Error fetching models from AI Gateway:', error);
    return [];
  }
}
