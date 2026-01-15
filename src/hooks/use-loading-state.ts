"use client";

import { useCallback, useState } from "react";

import { logError } from "@/lib/logging";

interface UseLoadingStateResult {
  isLoading: boolean;
  error: Error | null;
  execute: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
      timeout?: number;
    }
  ) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for managing loading and error states for async operations
 * @example
 * const { isLoading, error, execute } = useLoadingState();
 *
 * const handleClick = () => {
 *   execute(async () => {
 *     const response = await fetch('/api/data');
 *     return response.json();
 *   }, {
 *     onSuccess: (data) => console.log(data),
 *     onError: (error) => console.error(error)
 *   });
 * };
 */
export function useLoadingState(): UseLoadingStateResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async <T>(
      asyncFn: () => Promise<T>,
      options?: {
        onSuccess?: (result: T) => void;
        onError?: (error: Error) => void;
        timeout?: number;
      }
    ): Promise<T | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const result = await asyncFn();
        options?.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options?.onError?.(error);
        logError("[useLoadingState]", "Async operation failed", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return { isLoading, error, execute, reset };
}
