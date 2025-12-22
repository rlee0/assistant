import useSWR from 'swr';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  is_available: boolean;
}

const fetcher = async (url: string): Promise<AIModel[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
};

export function useModels() {
  const { data, error, isLoading, mutate } = useSWR<AIModel[]>(
    '/api/ai/models',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    models: data || [],
    isLoading,
    isError: error,
    refetch: mutate,
  };
}
